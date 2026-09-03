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
$category = $_GET['category'] ?? 'all';

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

$monthlyResStmt = $db->prepare('SELECT COUNT(*) FROM reservations WHERE YEAR(reservation_date) = ? AND MONTH(reservation_date) = ?');
$monthlyResStmt->execute([$year, $month]);
$monthlyApptStmt = $db->prepare('SELECT COUNT(*) FROM appointments WHERE YEAR(appointment_date) = ? AND MONTH(appointment_date) = ?');
$monthlyApptStmt->execute([$year, $month]);

$summary = [
    'total_parishioners' => (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn(),
    'total_users' => (int) $db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
    'pending_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status IN ('Pending', 'Under Review')")->fetchColumn(),
    'approved_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Approved'")->fetchColumn(),
    'rejected_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Rejected'")->fetchColumn(),
    'completed_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Completed'")->fetchColumn(),
    'pending_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")->fetchColumn(),
    'approved_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Approved'")->fetchColumn(),
    'completed_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Completed'")->fetchColumn(),
    'cancelled_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Cancelled'")->fetchColumn(),
    'total_records' => (int) $db->query('SELECT COUNT(*) FROM parish_records')->fetchColumn(),
    'today_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE DATE(reservation_date) = CURDATE()")->fetchColumn(),
    'today_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE DATE(appointment_date) = CURDATE()")->fetchColumn(),
    'monthly_reservations' => (int) $monthlyResStmt->fetchColumn(),
    'monthly_appointments' => (int) $monthlyApptStmt->fetchColumn(),
];

$reservations_chart = $db->prepare(
    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM reservations $where GROUP BY month ORDER BY month DESC LIMIT 12"
);
$reservations_chart->execute($params);
$reservations_chart_data = array_reverse($reservations_chart->fetchAll());

$appointments_chart = $db->prepare(
    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM appointments $where GROUP BY month ORDER BY month DESC LIMIT 12"
);
$appointments_chart->execute($params);
$appointments_chart_data = array_reverse($appointments_chart->fetchAll());

$users_by_role = $db->query(
    "SELECT 
        CASE WHEN role = 'admin' THEN 'Admins' ELSE 'Parishioners' END AS role,
        COUNT(*) AS count
     FROM users GROUP BY role"
)->fetchAll();

$reservation_status = $db->query(
    "SELECT status, COUNT(*) AS count FROM reservations GROUP BY status"
)->fetchAll();

$appointment_status = $db->query(
    "SELECT status, COUNT(*) AS count FROM appointments GROUP BY status"
)->fetchAll();

$service_breakdown = $db->query(
    "SELECT service_type, COUNT(*) AS count FROM reservations GROUP BY service_type"
)->fetchAll();

successResponse([
    'summary' => $summary,
    'reservations_chart' => $reservations_chart_data,
    'appointments_chart' => $appointments_chart_data,
    'users_by_role' => $users_by_role,
    'reservation_status' => $reservation_status,
    'appointment_status' => $appointment_status,
    'service_breakdown' => $service_breakdown,
]);
