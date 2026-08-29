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

$stats = [
    'total_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn(),
    'pending_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Pending'")->fetchColumn(),
    'pending_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")->fetchColumn(),
    'total_records' => (int) $db->query('SELECT COUNT(*) FROM parish_records')->fetchColumn(),
    'approved_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Approved'")->fetchColumn(),
];

$chart = $db->query(
    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM reservations GROUP BY month ORDER BY month DESC LIMIT 6"
)->fetchAll();

$services = $db->query(
    'SELECT service_type, COUNT(*) AS count FROM reservations GROUP BY service_type'
)->fetchAll();

successResponse([
    'stats' => $stats,
    'monthly_chart' => array_reverse($chart),
    'service_breakdown' => $services,
]);
