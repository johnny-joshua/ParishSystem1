<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !verifyCsrf()) {
    setFlash('danger', 'Invalid request.');
    redirect(appUrl('admin/records.php'));
}

$db = getDB();
$action = $_POST['action'] ?? '';
$serviceType = trim($_POST['service_type'] ?? '');
$details = trim($_POST['details'] ?? '');
$userId = $_POST['user_id'] ?? '';
$userId = ($userId !== '' && $userId !== '0') ? (int) $userId : null;

$searchQs = http_build_query(array_filter([
    'q' => $_POST['search_q'] ?? '',
    'service' => $_POST['search_service'] ?? '',
    'from' => $_POST['search_from'] ?? '',
    'to' => $_POST['search_to'] ?? '',
]));
$returnUrl = appUrl('admin/records.php') . ($searchQs !== '' ? '?' . $searchQs : '');

if ($serviceType === '' || $details === '') {
    setFlash('danger', 'Service type and details are required.');
    redirect($returnUrl);
}

if ($action === 'create') {
    $stmt = $db->prepare('INSERT INTO parish_records (user_id, service_type, details) VALUES (?, ?, ?)');
    $stmt->execute([$userId, $serviceType, $details]);
    setFlash('success', 'Parish record created.');
    redirect($returnUrl);
}

if ($action === 'update') {
    $id = (int) ($_POST['id'] ?? 0);
    if ($id < 1) {
        setFlash('danger', 'Invalid record.');
        redirect($returnUrl);
    }
    $stmt = $db->prepare('UPDATE parish_records SET user_id = ?, service_type = ?, details = ? WHERE id = ?');
    $stmt->execute([$userId, $serviceType, $details, $id]);
    setFlash('success', 'Parish record updated.');
    redirect($returnUrl);
}

if ($action === 'delete') {
    $id = (int) ($_POST['id'] ?? 0);
    if ($id < 1) {
        setFlash('danger', 'Invalid record.');
        redirect($returnUrl);
    }
    $stmt = $db->prepare('DELETE FROM parish_records WHERE id = ?');
    $stmt->execute([$id]);
    setFlash('success', 'Parish record deleted.');
    redirect($returnUrl);
}

setFlash('danger', 'Unknown action.');
redirect($returnUrl);
