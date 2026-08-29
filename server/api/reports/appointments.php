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
    $where .= ' AND DATE(a.appointment_date) >= ?';
    $params[] = $from;
}
if ($to !== '') {
    $where .= ' AND DATE(a.appointment_date) <= ?';
    $params[] = $to;
}

switch ($period) {
    case 'daily':
        $where .= ' AND DATE(a.appointment_date) = CURDATE()';
        break;
    case 'weekly':
        $where .= ' AND YEARWEEK(a.appointment_date, 1) = YEARWEEK(CURDATE(), 1)';
        break;
    case 'monthly':
        $where .= ' AND YEAR(a.appointment_date) = ? AND MONTH(a.appointment_date) = ?';
        $params[] = $year;
        $params[] = $month;
        break;
    case 'yearly':
        $where .= ' AND YEAR(a.appointment_date) = ?';
        $params[] = $year;
        break;
}

if ($status !== '') {
    $where .= ' AND a.status = ?';
    $params[] = $status;
}

if ($search !== '') {
    $where .= ' AND (u.fullname LIKE ? OR u.email LIKE ? OR a.purpose LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$sql = "SELECT a.*, u.fullname, u.email, u.phone 
        FROM appointments a 
        JOIN users u ON a.user_id = u.id 
        $where 
        ORDER BY a.appointment_date DESC, a.appointment_time DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$appointments = $stmt->fetchAll();

$status_counts = $db->prepare(
    "SELECT status, COUNT(*) AS count 
     FROM appointments a 
     $where 
     GROUP BY status"
);
$status_counts->execute($params);
$status_breakdown = $status_counts->fetchAll();

successResponse([
    'appointments' => $appointments,
    'status_breakdown' => $status_breakdown,
    'total' => count($appointments),
]);
