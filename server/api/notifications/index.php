<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../middleware/auth.php';

$auth = requireAuth();
$db = getDB();
$userId = (int) $auth['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] === '1';
    $sql = 'SELECT id, type, title, message, link, reference_type, reference_id, is_read, created_at
            FROM notifications WHERE user_id = ?';
    $params = [$userId];
    if ($unreadOnly) {
        $sql .= ' AND is_read = 0';
    }
    $sql .= ' ORDER BY created_at DESC LIMIT 100';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $notifications = $stmt->fetchAll();

    $countStmt = $db->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
    $countStmt->execute([$userId]);
    $unreadCount = (int) $countStmt->fetchColumn();

    successResponse([
        'notifications' => $notifications,
        'unread_count' => $unreadCount,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $data = getJsonInput();
    $markAll = !empty($data['mark_all_read']);
    $id = (int) ($data['id'] ?? 0);

    if ($markAll) {
        $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0');
        $stmt->execute([$userId]);
        successResponse(null, 'All notifications marked as read.');
    }

    if ($id <= 0) {
        errorResponse('Notification id is required.', 422);
    }

    $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    if ($stmt->rowCount() === 0) {
        errorResponse('Notification not found.', 404);
    }

    successResponse(null, 'Notification marked as read.');
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        errorResponse('Notification id is required.', 422);
    }

    $stmt = $db->prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    if ($stmt->rowCount() === 0) {
        errorResponse('Notification not found.', 404);
    }

    successResponse(null, 'Notification deleted.');
}

errorResponse('Method not allowed.', 405);
