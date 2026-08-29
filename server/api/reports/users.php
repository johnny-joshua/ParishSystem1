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
$role = $_GET['role'] ?? '';
$search = $_GET['search'] ?? '';

$where = 'WHERE 1=1';
$params = [];

if ($from !== '') {
    $where .= ' AND DATE(created_at) >= ?';
    $params[] = $from;
}
if ($to !== '') {
    $where .= ' AND DATE(created_at) <= ?';
    $params[] = $to;
}

switch ($period) {
    case 'daily':
        $where .= ' AND DATE(created_at) = CURDATE()';
        break;
    case 'weekly':
        $where .= ' AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)';
        break;
    case 'monthly':
        $where .= ' AND YEAR(created_at) = ? AND MONTH(created_at) = ?';
        $params[] = $year;
        $params[] = $month;
        break;
    case 'yearly':
        $where .= ' AND YEAR(created_at) = ?';
        $params[] = $year;
        break;
}

if ($role !== '') {
    $where .= ' AND role = ?';
    $params[] = $role;
}

if ($search !== '') {
    $where .= ' AND (fullname LIKE ? OR email LIKE ? OR phone LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$sql = "SELECT id, fullname, email, phone, address, role, created_at 
        FROM users 
        $where 
        ORDER BY created_at DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$users = $stmt->fetchAll();

$role_counts = $db->prepare(
    "SELECT role, COUNT(*) AS count 
     FROM users 
     $where 
     GROUP BY role"
);
$role_counts->execute($params);
$role_breakdown = $role_counts->fetchAll();

$monthly_registrations = $db->prepare(
    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count 
     FROM users 
     $where 
     GROUP BY month ORDER BY month DESC LIMIT 12"
);
$monthly_registrations->execute($params);
$registration_chart = array_reverse($monthly_registrations->fetchAll());

successResponse([
    'users' => $users,
    'role_breakdown' => $role_breakdown,
    'registration_chart' => $registration_chart,
    'total' => count($users),
]);
