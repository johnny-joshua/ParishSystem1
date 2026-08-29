<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/schedule.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/notifications.php';
require_once __DIR__ . '/../../utils/sms.php';
require_once __DIR__ . '/../../utils/documents.php';

$auth = requireAuth();
$db = getDB();
$isAdmin = ($auth['role'] ?? '') === 'admin';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = $_GET['status'] ?? '';
    if ($isAdmin) {
        $sql = 'SELECT r.*, u.fullname, u.email, u.phone FROM reservations r JOIN users u ON r.user_id = u.id WHERE 1=1';
        $params = [];
        if ($status !== '') {
            $sql .= ' AND r.status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY r.created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    } else {
        $sql = 'SELECT * FROM reservations WHERE user_id = ?';
        $params = [(int) $auth['user_id']];
        if ($status !== '') {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }
    successResponse(['reservations' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($isAdmin) {
        errorResponse('Admins cannot create reservations via this endpoint.', 403);
    }
    $data = getJsonInput();
    $errors = validateRequired(['service_type', 'reservation_date', 'reservation_time'], $data);
    if (!empty($errors)) {
        errorResponse('Validation failed.', 422, $errors);
    }
    if (!in_array($data['service_type'], allowedServiceTypes(), true)) {
        errorResponse('Invalid service type.', 422);
    }

    $date = (string) ($data['reservation_date'] ?? '');
    $time = normalizeTime((string) ($data['reservation_time'] ?? ''));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        errorResponse('Invalid reservation_date.', 422, ['reservation_date' => 'Please choose a valid date.']);
    }
    if ($date < date('Y-m-d')) {
        errorResponse('Reservation date cannot be in the past.', 422, ['reservation_date' => 'Please choose today or a future date.']);
    }
    if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $time)) {
        errorResponse('Invalid reservation_time.', 422, ['reservation_time' => 'Please choose a valid time slot.']);
    }

    $allowedSlots = allowedReservationSlots($data['service_type'], $date);
    if (empty($allowedSlots) || !in_array($time, $allowedSlots, true)) {
        errorResponse(
            'Selected date/time is not available for this service.',
            422,
            ['reservation_time' => 'Selected date/time is not available for this service.']
        );
    }

    $check = $db->prepare(
        "SELECT id FROM reservations WHERE reservation_date = ? AND reservation_time = ? AND status != 'Rejected' LIMIT 1"
    );
    $check->execute([$date, $time]);
    if ($check->fetch()) {
        errorResponse('This date and time slot is already booked.', 409);
    }

    $stmt = $db->prepare(
        'INSERT INTO reservations (user_id, service_type, reservation_date, reservation_time, requirements, status)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        (int) $auth['user_id'],
        $data['service_type'],
        $date,
        $time,
        sanitizeString($data['requirements'] ?? ''),
        'Pending',
    ]);

    $newId = (int) $db->lastInsertId();
    notifyAdmins(
        $db,
        'reservation',
        'New reservation request',
        "{$auth['fullname']} submitted a {$data['service_type']} reservation for {$date}.",
        '/admin/reservations',
        'reservation',
        $newId
    );

    notifyReservationSubmitted(
        $db,
        $newId,
        (int) $auth['user_id'],
        $data['service_type'],
        $date
    );

    // Send SMS notification to user
    $phoneStmt = $db->prepare('SELECT phone FROM users WHERE id = ? LIMIT 1');
    $phoneStmt->execute([(int) $auth['user_id']]);
    $userPhone = (string) ($phoneStmt->fetchColumn() ?: '');
    if ($userPhone) {
        $smsMessage = "Your reservation request has been received and is pending approval.";
        sendSMS($db, (int) $auth['user_id'], $userPhone, $smsMessage);
    }

    successResponse(['id' => $newId], 'Reservation submitted successfully.', 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    if (!$isAdmin) {
        errorResponse('Admin access required.', 403);
    }
    $data = getJsonInput();
    $id = (int) ($data['id'] ?? 0);
    $status = $data['status'] ?? '';
    $remarks = sanitizeString($data['remarks'] ?? '');

    if ($id <= 0 || !in_array($status, allowedStatuses(), true)) {
        errorResponse('Invalid reservation update.', 422);
    }

    $stmt = $db->prepare('SELECT id, service_type, status FROM reservations WHERE id = ?');
    $stmt->execute([$id]);
    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$reservation) {
        errorResponse('Reservation not found.', 404);
    }

    $previousStatus = (string) $reservation['status'];
    $statusChanged = $status !== $previousStatus;

    // Prevent approval if required documents are not verified
    if ($status === 'Approved') {
        if (!areRequiredDocumentsVerified($db, $id, $reservation['service_type'])) {
            $summary = getReservationDocumentSummary($db, $id, $reservation['service_type']);
            errorResponse(
                'All required documents must be verified before approving this reservation. ' .
                "Verified: {$summary['verified']}/{$summary['total_required']}, " .
                "Rejected: {$summary['rejected']}, " .
                "Missing: {$summary['missing']}.",
                422
            );
        }
    }

    $upd = $db->prepare('UPDATE reservations SET status = ?, remarks = ? WHERE id = ?');
    $upd->execute([$status, $remarks ?: null, $id]);

    notifyReservationStatusChange($db, $id, $status);

    // Send SMS only when status actually changes
    if ($statusChanged) {
        $smsStmt = $db->prepare('SELECT user_id, phone FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.id = ?');
        $smsStmt->execute([$id]);
        $reservationUser = $smsStmt->fetch(PDO::FETCH_ASSOC);

        if ($reservationUser && $reservationUser['phone']) {
            $smsMessages = [
                'Approved' => 'Your reservation has been approved.',
                'Rejected' => 'Your reservation request has been rejected.',
            ];

            if (isset($smsMessages[$status])) {
                sendSMS($db, (int) $reservationUser['user_id'], $reservationUser['phone'], $smsMessages[$status]);
            }
        }
    }

    successResponse(null, "Reservation $status.");
}

errorResponse('Method not allowed.', 405);
