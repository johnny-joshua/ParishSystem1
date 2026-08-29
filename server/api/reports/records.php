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
$service = $_GET['service'] ?? '';
$search = $_GET['search'] ?? '';

$where = 'WHERE 1=1';
$params = [];

if ($from !== '') {
    $where .= ' AND DATE(pr.created_at) >= ?';
    $params[] = $from;
}
if ($to !== '') {
    $where .= ' AND DATE(pr.created_at) <= ?';
    $params[] = $to;
}

switch ($period) {
    case 'daily':
        $where .= ' AND DATE(pr.created_at) = CURDATE()';
        break;
    case 'weekly':
        $where .= ' AND YEARWEEK(pr.created_at, 1) = YEARWEEK(CURDATE(), 1)';
        break;
    case 'monthly':
        $where .= ' AND YEAR(pr.created_at) = ? AND MONTH(pr.created_at) = ?';
        $params[] = $year;
        $params[] = $month;
        break;
    case 'yearly':
        $where .= ' AND YEAR(pr.created_at) = ?';
        $params[] = $year;
        break;
}

if ($service !== '') {
    $where .= ' AND pr.service_type LIKE ?';
    $params[] = '%' . $service . '%';
}

if ($search !== '') {
    $where .= ' AND (pr.details LIKE ? OR pr.service_type LIKE ? OR u.fullname LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$sql = "SELECT pr.*, u.fullname AS parishioner_name 
        FROM parish_records pr 
        LEFT JOIN users u ON pr.user_id = u.id 
        $where 
        ORDER BY pr.created_at DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$records = $stmt->fetchAll();

$service_counts = $db->prepare(
    "SELECT service_type, COUNT(*) AS count 
     FROM parish_records pr 
     $where 
     GROUP BY service_type"
);
$service_counts->execute($params);
$service_breakdown = $service_counts->fetchAll();

$monthly_records = $db->prepare(
    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count 
     FROM parish_records pr 
     $where 
     GROUP BY month ORDER BY month DESC LIMIT 12"
);
$monthly_records->execute($params);
$records_chart = array_reverse($monthly_records->fetchAll());

successResponse([
    'records' => $records,
    'service_breakdown' => $service_breakdown,
    'records_chart' => $records_chart,
    'total' => count($records),
]);
