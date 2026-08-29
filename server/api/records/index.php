<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../middleware/auth.php';

requireAdmin();

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $q = trim($_GET['q'] ?? '');
    $service = trim($_GET['service'] ?? '');
    $from = $_GET['from'] ?? '';
    $to = $_GET['to'] ?? '';

    $sql = 'SELECT pr.*, u.fullname AS parishioner_name FROM parish_records pr LEFT JOIN users u ON pr.user_id = u.id WHERE 1=1';
    $params = [];

    if ($q !== '') {
        $sql .= ' AND (pr.details LIKE ? OR u.fullname LIKE ? OR pr.service_type LIKE ?)';
        $like = '%' . $q . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    if ($service !== '') {
        $sql .= ' AND pr.service_type LIKE ?';
        $params[] = '%' . $service . '%';
    }
    if ($from !== '') {
        $sql .= ' AND DATE(pr.created_at) >= ?';
        $params[] = $from;
    }
    if ($to !== '') {
        $sql .= ' AND DATE(pr.created_at) <= ?';
        $params[] = $to;
    }

    $sql .= ' ORDER BY pr.created_at DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    successResponse(['records' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getJsonInput();
    $errors = validateRequired(['service_type', 'details'], $data);
    if (!empty($errors)) {
        errorResponse('Validation failed.', 422, $errors);
    }

    $stmt = $db->prepare('INSERT INTO parish_records (user_id, service_type, details) VALUES (?, ?, ?)');
    $stmt->execute([
        !empty($data['user_id']) ? (int) $data['user_id'] : null,
        sanitizeString($data['service_type']),
        sanitizeString($data['details']),
    ]);

    successResponse(['id' => (int) $db->lastInsertId()], 'Record created.', 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = getJsonInput();
    $id = (int) ($data['id'] ?? 0);
    $errors = validateRequired(['service_type', 'details'], $data);
    if ($id <= 0 || !empty($errors)) {
        errorResponse('Invalid record update.', 422, $errors);
    }

    $stmt = $db->prepare('UPDATE parish_records SET user_id = ?, service_type = ?, details = ? WHERE id = ?');
    $stmt->execute([
        !empty($data['user_id']) ? (int) $data['user_id'] : null,
        sanitizeString($data['service_type']),
        sanitizeString($data['details']),
        $id,
    ]);

    successResponse(null, 'Record updated.');
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        errorResponse('Invalid record ID.', 400);
    }
    $db->prepare('DELETE FROM parish_records WHERE id = ?')->execute([$id]);
    successResponse(null, 'Record deleted.');
}

errorResponse('Method not allowed.', 405);
