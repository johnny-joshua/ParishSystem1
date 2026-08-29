<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

$auth = requireAuth();
$db = getDB();

$stmt = $db->prepare(
    'SELECT id, fullname, email, phone, address, role, created_at FROM users WHERE id = ? LIMIT 1'
);
$stmt->execute([(int) $auth['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    destroyUserSession();
    errorResponse('Session invalid. Please log in again.', 401);
}

successResponse(['user' => $user]);
