<?php

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
        'SELECT user_id, service_type, reservation_date FROM reservations WHERE id = ?'
    );
    $stmt->execute([$reservationId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return;
    }

    $userId = (int) $row['user_id'];
    $service = $row['service_type'];
    $date = $row['reservation_date'];

    $messages = [
        'Approved' => "Your {$service} reservation on {$date} has been approved.",
        'Rejected' => "Your {$service} reservation on {$date} was not approved. Check remarks for details.",
        'Completed' => "Your {$service} reservation on {$date} has been marked completed.",
        'Pending' => "Your {$service} reservation is pending review.",
    ];

    $title = "Reservation {$status}";
    $message = $messages[$status] ?? "Your reservation status changed to {$status}.";

    createNotification(
        $db,
        $userId,
        'reservation',
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

function notifyAppointmentStatusChange(PDO $db, int $appointmentId, string $status): void
{
    $stmt = $db->prepare(
        'SELECT user_id, appointment_date FROM appointments WHERE id = ?'
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

    $messages = [
        'Approved' => "Your parish office appointment on {$date} has been approved.",
        'Rejected' => "Your appointment on {$date} was not approved.",
        'Completed' => "Your appointment on {$date} has been marked completed.",
        'Pending' => "Your appointment is pending review.",
        'Cancelled' => "Your appointment on {$date} has been cancelled.",
    ];

    $title = "Appointment {$status}";
    $message = $messages[$status] ?? "Your appointment status changed to {$status}.";

    createNotification(
        $db,
        $userId,
        'appointment',
        $title,
        $message,
        '/appointments',
        'appointment',
        $appointmentId
    );
}
