<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

$auth = requireAdmin();
$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = $_GET['status'] ?? '';
    $search = $_GET['search'] ?? '';
    $page = (int) ($_GET['page'] ?? 1);
    $limit = (int) ($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;

    $sql = 'SELECT sl.*, u.fullname, u.email 
            FROM sms_logs sl 
            JOIN users u ON sl.user_id = u.id 
            WHERE 1=1';
    $params = [];

    if ($status !== '') {
        $sql .= ' AND sl.status = ?';
        $params[] = $status;
    }

    if ($search !== '') {
        $sql .= ' AND (sl.phone_number LIKE ? OR u.fullname LIKE ? OR u.email LIKE ?)';
        $searchParam = '%' . $search . '%';
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    $sql .= ' ORDER BY sl.created_at DESC LIMIT ? OFFSET ?';
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll();

    // Get total count for pagination
    $countSql = 'SELECT COUNT(*) as total FROM sms_logs sl JOIN users u ON sl.user_id = u.id WHERE 1=1';
    $countParams = [];

    if ($status !== '') {
        $countSql .= ' AND sl.status = ?';
        $countParams[] = $status;
    }

    if ($search !== '') {
        $countSql .= ' AND (sl.phone_number LIKE ? OR u.fullname LIKE ? OR u.email LIKE ?)';
        $searchParam = '%' . $search . '%';
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
    }

    $countStmt = $db->prepare($countSql);
    $countStmt->execute($countParams);
    $total = $countStmt->fetch()['total'];

    successResponse([
        'logs' => $logs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $total,
            'pages' => ceil($total / $limit),
        ],
    ]);
}

errorResponse('Method not allowed.', 405);
