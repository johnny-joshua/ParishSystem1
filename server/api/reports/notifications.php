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
$type = $_GET['type'] ?? '';
$search = $_GET['search'] ?? '';

$where = 'WHERE 1=1';
$params = [];

if ($from !== '') {
    $where .= ' AND DATE(n.created_at) >= ?';
    $params[] = $from;
}
if ($to !== '') {
    $where .= ' AND DATE(n.created_at) <= ?';
    $params[] = $to;
}

switch ($period) {
    case 'daily':
        $where .= ' AND DATE(n.created_at) = CURDATE()';
        break;
    case 'weekly':
        $where .= ' AND YEARWEEK(n.created_at, 1) = YEARWEEK(CURDATE(), 1)';
        break;
    case 'monthly':
        $where .= ' AND YEAR(n.created_at) = ? AND MONTH(n.created_at) = ?';
        $params[] = $year;
        $params[] = $month;
        break;
    case 'yearly':
        $where .= ' AND YEAR(n.created_at) = ?';
        $params[] = $year;
        break;
}

if ($type !== '') {
    $where .= ' AND n.type = ?';
    $params[] = $type;
}

if ($search !== '') {
    $where .= ' AND (n.title LIKE ? OR n.message LIKE ? OR u.fullname LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$sql = "SELECT n.*, u.fullname AS user_name 
        FROM notifications n 
        JOIN users u ON n.user_id = u.id 
        $where 
        ORDER BY n.created_at DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$notifications = $stmt->fetchAll();

$type_counts = $db->prepare(
    "SELECT type, COUNT(*) AS count 
     FROM notifications n 
     $where 
     GROUP BY type"
);
$type_counts->execute($params);
$type_breakdown = $type_counts->fetchAll();

$read_status = $db->prepare(
    "SELECT is_read, COUNT(*) AS count 
     FROM notifications n 
     $where 
     GROUP BY is_read"
);
$read_status->execute($params);
$read_breakdown = $read_status->fetchAll();

$monthly_notifications = $db->prepare(
    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count 
     FROM notifications n 
     $where 
     GROUP BY month ORDER BY month DESC LIMIT 12"
);
$monthly_notifications->execute($params);
$notifications_chart = array_reverse($monthly_notifications->fetchAll());

successResponse([
    'notifications' => $notifications,
    'type_breakdown' => $type_breakdown,
    'read_breakdown' => $read_breakdown,
    'notifications_chart' => $notifications_chart,
    'total' => count($notifications),
]);
