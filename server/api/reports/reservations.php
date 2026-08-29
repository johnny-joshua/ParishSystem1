<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

$db = getDB();

$from = $_GET['from'] ?? '';
$to = $_GET['to'] ?? '';
$period = $_GET['period'] ?? 'monthly';
$year = (int) ($_GET['year'] ?? date('Y'));
$month = (int) ($_GET['month'] ?? date('n'));
$status = $_GET['status'] ?? '';
$search = $_GET['search'] ?? '';

$where = 'WHERE 1=1';
$params = [];

if ($from !== '') {
    $where .= ' AND DATE(r.reservation_date) >= ?';
    $params[] = $from;
}
if ($to !== '') {
    $where .= ' AND DATE(r.reservation_date) <= ?';
    $params[] = $to;
}

switch ($period) {
    case 'daily':
        $where .= ' AND DATE(r.reservation_date) = CURDATE()';
        break;
    case 'weekly':
        $where .= ' AND YEARWEEK(r.reservation_date, 1) = YEARWEEK(CURDATE(), 1)';
        break;
    case 'monthly':
        $where .= ' AND YEAR(r.reservation_date) = ? AND MONTH(r.reservation_date) = ?';
        $params[] = $year;
        $params[] = $month;
        break;
    case 'yearly':
        $where .= ' AND YEAR(r.reservation_date) = ?';
        $params[] = $year;
        break;
}

if ($status !== '') {
    $where .= ' AND r.status = ?';
    $params[] = $status;
}

if ($search !== '') {
    $where .= ' AND (u.fullname LIKE ? OR u.email LIKE ? OR r.service_type LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$sql = "SELECT r.*, u.fullname, u.email, u.phone 
        FROM reservations r 
        JOIN users u ON r.user_id = u.id 
        $where 
        ORDER BY r.reservation_date DESC, r.reservation_time DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$reservations = $stmt->fetchAll();

$status_counts = $db->prepare(
    "SELECT status, COUNT(*) AS count 
     FROM reservations r 
     $where 
     GROUP BY status"
);
$status_counts->execute($params);
$status_breakdown = $status_counts->fetchAll();

$service_counts = $db->prepare(
    "SELECT service_type, COUNT(*) AS count 
     FROM reservations r 
     $where 
     GROUP BY service_type"
);
$service_counts->execute($params);
$service_breakdown = $service_counts->fetchAll();

successResponse([
    'reservations' => $reservations,
    'status_breakdown' => $status_breakdown,
    'service_breakdown' => $service_breakdown,
    'total' => count($reservations),
]);
