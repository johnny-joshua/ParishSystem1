<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/schedule.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/notifications.php';
require_once __DIR__ . '/../../utils/sms.php';

$auth = requireAuth();
$db = getDB();
$isAdmin = ($auth['role'] ?? '') === 'admin';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = $_GET['status'] ?? '';
    if ($isAdmin) {
        $sql = 'SELECT a.*, u.fullname, u.email, u.phone FROM appointments a JOIN users u ON a.user_id = u.id WHERE 1=1';
        $params = [];
        if ($status !== '') {
            $sql .= ' AND a.status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY a.created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    } else {
        $sql = 'SELECT * FROM appointments WHERE user_id = ?';
        $params = [(int) $auth['user_id']];
        if ($status !== '') {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }
    successResponse(['appointments' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($isAdmin) {
        errorResponse('Admins cannot create appointments via this endpoint.', 403);
    }
    $data = getJsonInput();
    $errors = validateRequired(['appointment_date', 'appointment_time', 'purpose'], $data);
    if (!empty($errors)) {
        errorResponse('Validation failed.', 422, $errors);
    }

    $date = (string) ($data['appointment_date'] ?? '');
    $time = normalizeTime((string) ($data['appointment_time'] ?? ''));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        errorResponse('Invalid appointment_date.', 422, ['appointment_date' => 'Please choose a valid date.']);
    }
    if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $time)) {
        errorResponse('Invalid appointment_time.', 422, ['appointment_time' => 'Please choose a valid time slot.']);
    }

    $allowedSlots = allowedAppointmentSlots($date);
    if (empty($allowedSlots) || !in_array($time, $allowedSlots, true)) {
        errorResponse(
            'Selected date/time is not available for appointments.',
            422,
            ['appointment_time' => 'Selected date/time is not available. Appointments are available Monday–Friday from 8:00 AM to 4:30 PM.']
        );
    }

    if ($date === parishToday()->format('Y-m-d')) {
        $bookableSlots = filterPastAppointmentSlots($date, $allowedSlots);
        if (!in_array($time, $bookableSlots, true)) {
            errorResponse(
                'This appointment time has already passed.',
                422,
                ['appointment_time' => 'This appointment time has already passed.']
            );
        }
    }

    $check = $db->prepare(
        "SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status != 'Rejected' AND status != 'Cancelled' LIMIT 1"
    );
    $stmt = $db->prepare(
        'INSERT INTO appointments (user_id, appointment_date, appointment_time, purpose, status) VALUES (?, ?, ?, ?, ?)'
    );

    try {
        $db->beginTransaction();

        $check->execute([$date, $time]);
        if ($check->fetch()) {
            $db->rollBack();
            errorResponse('This date and time slot is already booked.', 409);
        }

        $stmt->execute([
            (int) $auth['user_id'],
            $date,
            $time,
            sanitizeString($data['purpose']),
            'Pending',
        ]);

        $newId = (int) $db->lastInsertId();
        $db->commit();
    } catch (PDOException $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        $sqlState = (string) $e->getCode();
        $driverCode = (int) ($e->errorInfo[1] ?? 0);
        if ($sqlState === '23000' || $driverCode === 1062) {
            errorResponse('This date and time slot is already booked.', 409);
        }
        throw $e;
    }
    notifyAdmins(
        $db,
        'appointment',
        'New appointment request',
        "{$auth['fullname']} requested a parish office appointment on {$date}.",
        '/admin/appointments',
        'appointment',
        $newId
    );

    $wantsUpdates = userWantsAppointmentUpdates($db, (int) $auth['user_id']);

    if ($wantsUpdates) {
        notifyAppointmentSubmitted(
            $db,
            $newId,
            (int) $auth['user_id'],
            $date
        );

        // Send SMS notification to user
        $phoneStmt = $db->prepare('SELECT phone FROM users WHERE id = ? LIMIT 1');
        $phoneStmt->execute([(int) $auth['user_id']]);
        $userPhone = (string) ($phoneStmt->fetchColumn() ?: '');
        if ($userPhone) {
            $smsMessage = "Your appointment request has been received and is pending approval.";
            sendSMS($db, (int) $auth['user_id'], $userPhone, $smsMessage);
        }
    }

    successResponse(['id' => $newId], 'Appointment requested.', 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $data = getJsonInput();
    $id = (int) ($data['id'] ?? 0);
    $status = $data['status'] ?? '';

    if ($id <= 0 || !in_array($status, allowedStatuses(), true)) {
        errorResponse('Invalid update.', 422);
    }

    $stmt = $db->prepare('SELECT id, user_id, status, remarks FROM appointments WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$existing) {
        errorResponse('Appointment not found.', 404);
    }

    // Parishioners may only cancel their own Pending/Approved appointments.
    // Admins retain full status-update workflow.
    if (!$isAdmin) {
        if ((int) $existing['user_id'] !== (int) $auth['user_id']) {
            errorResponse('You do not have permission to update this appointment.', 403);
        }
        if ($status !== 'Cancelled') {
            errorResponse('Parishioners can only cancel appointments.', 403);
        }
        if (!in_array((string) $existing['status'], ['Pending', 'Approved'], true)) {
            errorResponse('This appointment cannot be cancelled.', 422);
        }
    }

    $previousStatus = (string) $existing['status'];
    $statusChanged = $status !== $previousStatus;

    if ($statusChanged) {
        $allowedTransitions = [
            'Pending' => ['Approved', 'Rejected', 'Cancelled'],
            'Approved' => ['Completed', 'Cancelled'],
            'Rejected' => [],
            'Completed' => [],
            'Cancelled' => [],
        ];
        $allowedNext = $allowedTransitions[$previousStatus] ?? [];
        if (!in_array($status, $allowedNext, true)) {
            errorResponse('Invalid appointment status transition.', 422);
        }
    }

    // Update remarks when provided by admin; omit the field to leave existing remarks unchanged.
    // Parishioner cancel never changes remarks.
    if ($isAdmin && array_key_exists('remarks', $data)) {
        $remarks = sanitizeString((string) ($data['remarks'] ?? ''));
        $remarksValue = $remarks !== '' ? $remarks : null;
    } else {
        $remarksValue = $existing['remarks'];
    }

    $approvedBy = null;
    if ($isAdmin && in_array($status, ['Approved', 'Rejected', 'Completed', 'Cancelled'], true)) {
        $approvedBy = (int) $auth['user_id'];
    }

    $upd = $db->prepare(
        'UPDATE appointments
         SET status = ?, remarks = ?, updated_at = NOW(),
             approved_by = COALESCE(?, approved_by),
             cancelled_at = CASE WHEN ? = \'Cancelled\' THEN NOW() ELSE cancelled_at END
         WHERE id = ?'
    );
    $upd->execute([$status, $remarksValue, $approvedBy, $status, $id]);

    // Notify / SMS only when status actually changes (remarks-only saves must not spam).
    if ($statusChanged) {
        $appointmentUserId = (int) $existing['user_id'];
        $wantsUpdates = userWantsAppointmentUpdates($db, $appointmentUserId);

        if ($wantsUpdates) {
            notifyAppointmentStatusChange($db, $id, $status);

            $smsStmt = $db->prepare(
                'SELECT user_id, phone FROM appointments a JOIN users u ON a.user_id = u.id WHERE a.id = ?'
            );
            $smsStmt->execute([$id]);
            $appointment = $smsStmt->fetch(PDO::FETCH_ASSOC);

            if ($appointment && $appointment['phone']) {
                $smsMessages = [
                    'Approved' => 'Your appointment has been approved.',
                    'Rejected' => 'Your appointment request has been rejected.',
                    'Cancelled' => 'Your appointment has been cancelled.',
                    'Completed' => 'Your appointment has been marked completed.',
                ];

                if (isset($smsMessages[$status])) {
                    sendSMS($db, (int) $appointment['user_id'], $appointment['phone'], $smsMessages[$status]);
                }
            }
        }
    }

    successResponse(
        [
            'id' => $id,
            'status' => $status,
            'remarks' => $remarksValue,
        ],
        $statusChanged ? "Appointment $status." : 'Appointment remarks updated.'
    );
}

errorResponse('Method not allowed.', 405);
