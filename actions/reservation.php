<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../server/utils/schedule.php';
require_once __DIR__ . '/../server/utils/notifications.php';
require_once __DIR__ . '/../server/utils/sms.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !verifyCsrf()) {
    setFlash('danger', 'Invalid request.');
    redirect(appUrl('index.php'));
}

$db = getDB();
$action = $_POST['action'] ?? 'create';

if ($action === 'create') {
    requireUser();
    $userId = (int) $_SESSION['user_id'];
    $serviceType = $_POST['service_type'] ?? '';
    $date = $_POST['reservation_date'] ?? '';
    $time = normalizeTime($_POST['reservation_time'] ?? '');
    $requirements = trim($_POST['requirements'] ?? '');

    if (!in_array($serviceType, serviceTypes(), true) || $date === '' || $time === '') {
        setFlash('danger', 'Please complete all required fields.');
        redirect(appUrl('parishioner/reservations.php'));
    }

    $allowedSlots = allowedReservationSlots($serviceType, $date);
    if (empty($allowedSlots) || !in_array($time, $allowedSlots, true)) {
        setFlash('danger', 'Selected date and time are not available for this service. Please check the parish schedule.');
        redirect(appUrl('parishioner/reservations.php'));
    }

    $stmt = $db->prepare(
        "SELECT id FROM reservations
         WHERE reservation_date = ? AND reservation_time = ? AND status != 'Rejected' LIMIT 1"
    );
    $stmt->execute([$date, $time]);
    if ($stmt->fetch()) {
        setFlash('danger', 'This date and time slot is already reserved. Please choose another.');
        redirect(appUrl('parishioner/reservations.php'));
    }

    $stmt = $db->prepare(
        'INSERT INTO reservations (user_id, service_type, reservation_date, reservation_time, requirements)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $serviceType, $date, $time, $requirements ?: null]);
    $newId = (int) $db->lastInsertId();

    $user = currentUser();
    notifyAdmins(
        $db,
        'reservation',
        'New reservation request',
        "{$user['fullname']} submitted a {$serviceType} reservation for {$date}.",
        '/admin/reservations',
        'reservation',
        $newId
    );
    notifyReservationSubmitted($db, $newId, $userId, $serviceType, $date);

    $phoneStmt = $db->prepare('SELECT phone FROM users WHERE id = ? LIMIT 1');
    $phoneStmt->execute([$userId]);
    $userPhone = (string) ($phoneStmt->fetchColumn() ?: '');
    if ($userPhone) {
        sendSMS($db, $userId, $userPhone, 'Your reservation request has been received and is pending approval.');
    }

    setFlash('success', 'Reservation submitted. Awaiting parish approval.');
    redirect(appUrl('parishioner/reservations.php'));
}

if ($action === 'update_status') {
    requireAdmin();
    $id = (int) ($_POST['id'] ?? 0);
    $status = $_POST['status'] ?? '';
    $remarks = trim($_POST['remarks'] ?? '');

    if (!in_array($status, reservationStatuses(), true) || $id < 1) {
        setFlash('danger', 'Invalid reservation update.');
        redirect(appUrl('admin/reservations.php'));
    }

    $previousStmt = $db->prepare('SELECT status FROM reservations WHERE id = ?');
    $previousStmt->execute([$id]);
    $previousStatus = (string) $previousStmt->fetchColumn();
    $statusChanged = $status !== $previousStatus;

    $stmt = $db->prepare('UPDATE reservations SET status = ?, remarks = ? WHERE id = ?');
    $stmt->execute([$status, $remarks ?: null, $id]);

    // Notification/SMS only on a real status transition, to match the API endpoint's dedup behavior.
    if ($statusChanged) {
        notifyReservationStatusChange($db, $id, $status);

        $smsStmt = $db->prepare('SELECT user_id, phone FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.id = ?');
        $smsStmt->execute([$id]);
        $reservation = $smsStmt->fetch(PDO::FETCH_ASSOC);
        if ($reservation && $reservation['phone']) {
            $smsMessages = [
                'Approved' => 'Your reservation has been approved.',
                'Rejected' => 'Your reservation request has been rejected.',
            ];
            if (isset($smsMessages[$status])) {
                sendSMS($db, (int) $reservation['user_id'], $reservation['phone'], $smsMessages[$status]);
            }
        }
    }

    setFlash('success', 'Reservation status updated to ' . $status . '.');
    redirect(appUrl('admin/reservations.php' . (isset($_POST['filter']) ? '?status=' . urlencode($_POST['filter']) : '')));
}

setFlash('danger', 'Unknown action.');
redirect(appUrl('index.php'));
