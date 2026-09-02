<?php

function notificationExists(
    PDO $db,
    int $userId,
    string $type,
    string $referenceType,
    int $referenceId
): bool {
    try {
        $stmt = $db->prepare(
            'SELECT id FROM notifications
             WHERE user_id = ? AND type = ? AND reference_type = ? AND reference_id = ?
             LIMIT 1'
        );
        $stmt->execute([$userId, $type, $referenceType, $referenceId]);
        return $stmt->fetch() !== false;
    } catch (Throwable $e) {
        error_log('Notification existence check failed: ' . $e->getMessage());
        return false;
    }
}

function createNotification(
    PDO $db,
    int $userId,
    string $type,
    string $title,
    string $message,
    ?string $link = null,
    ?string $referenceType = null,
    ?int $referenceId = null
): bool {
    try {
        // Check for a duplicate for the actual recipient and event reference.
        if ($referenceType && $referenceId) {
            if (notificationExists($db, $userId, $type, $referenceType, $referenceId)) {
                return false;
            }
        }

        $stmt = $db->prepare(
            'INSERT INTO notifications (user_id, type, title, message, link, reference_type, reference_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $type, $title, $message, $link, $referenceType, $referenceId]);
        return true;
    } catch (Throwable $e) {
        error_log('Notification insert failed: ' . $e->getMessage());
        return false;
    }
}

function getAdminUserIds(PDO $db): array
{
    $stmt = $db->query("SELECT id FROM users WHERE role = 'admin'");
    return array_map('intval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id'));
}

/**
 * Whether the user opted in to appointment notifications / SMS.
 * Missing column or missing user defaults to enabled.
 */
function userWantsAppointmentUpdates(PDO $db, int $userId): bool
{
    try {
        $stmt = $db->prepare('SELECT appointment_updates FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $value = $stmt->fetchColumn();
        if ($value === false) {
            return true;
        }
        return (int) $value === 1;
    } catch (Throwable $e) {
        error_log('appointment_updates preference read failed: ' . $e->getMessage());
        return true;
    }
}

function notifyAdmins(
    PDO $db,
    string $type,
    string $title,
    string $message,
    ?string $link = null,
    ?string $referenceType = null,
    ?int $referenceId = null
): void {
    // createNotification deduplicates independently for each admin recipient.
    foreach (getAdminUserIds($db) as $adminId) {
        createNotification($db, $adminId, $type, $title, $message, $link, $referenceType, $referenceId);
    }
}

function notifyReservationSubmitted(
    PDO $db,
    int $reservationId,
    int $userId,
    string $serviceType,
    string $date
): void {
    createNotification(
        $db,
        $userId,
        'reservation',
        'Reservation Submitted',
        "Your {$serviceType} reservation for {$date} has been submitted and is pending review.",
        '/reservations',
        'reservation',
        $reservationId
    );
}

function notifyReservationStatusChange(PDO $db, int $reservationId, string $status): void
{
    $stmt = $db->prepare(
        'SELECT user_id, service_type, reservation_date, reservation_time, remarks
         FROM reservations WHERE id = ?'
    );
    $stmt->execute([$reservationId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return;
    }

    $userId = (int) $row['user_id'];
    $service = $row['service_type'];
    $date = $row['reservation_date'];
    $time = $row['reservation_time'];
    $remarks = trim((string) ($row['remarks'] ?? ''));

    $messages = [
        'Approved' => "Your {$service} reservation has been approved by the Holy Family Parish.",
        'Rejected' => "Your {$service} reservation has been rejected by the Holy Family Parish.",
        'Completed' => "Your {$service} reservation on {$date} has been marked completed.",
        'Pending' => "Your {$service} reservation is pending review.",
    ];

    if (!isset($messages[$status])) {
        return;
    }

    if ($status === 'Approved' || $status === 'Rejected') {
        $message = $messages[$status] . "\nDate: {$date}\nTime: {$time}";
        if ($status === 'Rejected' && $remarks !== '') {
            $message .= "\nReason: {$remarks}";
        }
    } else {
        $message = $messages[$status];
    }

    $type = in_array($status, ['Approved', 'Rejected'], true)
        ? 'reservation_' . strtolower($status)
        : 'reservation';
    $title = "{$service} Reservation {$status}";

    createNotification(
        $db,
        $userId,
        $type,
        $title,
        $message,
        '/reservations',
        'reservation',
        $reservationId
    );
}

function notifyAppointmentSubmitted(
    PDO $db,
    int $appointmentId,
    int $userId,
    string $date
): void {
    if (!userWantsAppointmentUpdates($db, $userId)) {
        return;
    }

    createNotification(
        $db,
        $userId,
        'appointment',
        'Appointment Submitted',
        "Your parish office appointment for {$date} has been submitted and is pending review.",
        '/appointments',
        'appointment',
        $appointmentId
    );
}

function notifyAdminsOfAppointmentCancellation(PDO $db, int $appointmentId): void
{
    $stmt = $db->prepare(
        'SELECT u.fullname, a.purpose, a.appointment_date, a.appointment_time
         FROM appointments a
         INNER JOIN users u ON a.user_id = u.id
         WHERE a.id = ?
         LIMIT 1'
    );
    $stmt->execute([$appointmentId]);
    $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$appointment) {
        return;
    }

    $date = (new DateTimeImmutable($appointment['appointment_date']))->format('F j, Y');
    $time = DateTimeImmutable::createFromFormat('H:i:s', (string) $appointment['appointment_time']);
    $timeLabel = $time ? $time->format('g:i A') : (string) $appointment['appointment_time'];

    notifyAdmins(
        $db,
        'appointment_cancelled',
        'Appointment Cancelled',
        "{$appointment['fullname']} has cancelled their appointment for {$appointment['purpose']} scheduled on {$date} at {$timeLabel}.",
        '/admin/appointments',
        'appointment',
        $appointmentId
    );
}

function notifyAppointmentStatusChange(PDO $db, int $appointmentId, string $status): void
{
    $stmt = $db->prepare(
        'SELECT user_id, appointment_date, appointment_time, purpose, remarks
         FROM appointments WHERE id = ?'
    );
    $stmt->execute([$appointmentId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return;
    }

    $userId = (int) $row['user_id'];
    if (!userWantsAppointmentUpdates($db, $userId)) {
        return;
    }

    $date = $row['appointment_date'];
    $time = $row['appointment_time'];
    $purpose = $row['purpose'];
    $remarks = trim((string) ($row['remarks'] ?? ''));

    $messages = [
        'Approved' => "Your appointment for {$purpose} on {$date} at {$time} has been approved.",
        'Rejected' => "Your appointment request for {$purpose} has been rejected.",
        'Completed' => "Your appointment on {$date} has been marked completed.",
        'Pending' => "Your appointment is pending review.",
        'Cancelled' => "Your appointment on {$date} has been cancelled.",
    ];

    if (!isset($messages[$status])) {
        return;
    }

    $title = "Appointment {$status}";
    $message = $messages[$status];
    if ($status === 'Rejected' && $remarks !== '') {
        $message .= "\nReason: {$remarks}";
    }
    $type = in_array($status, ['Approved', 'Rejected'], true)
        ? 'appointment_' . strtolower($status)
        : 'appointment';

    createNotification(
        $db,
        $userId,
        $type,
        $title,
        $message,
        '/appointments',
        'appointment',
        $appointmentId
    );
}
