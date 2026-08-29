<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../middleware/auth.php';

$auth = requireAdmin();
$db = getDB();

function formatUser(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'fullname' => $row['fullname'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'address' => $row['address'] ?? '',
        'role' => $row['role'],
        'created_at' => $row['created_at'] ?? null,
    ];
}

function countAdmins(PDO $db): int
{
    return (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $role = trim($_GET['role'] ?? '');
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int) ($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $where = 'WHERE 1=1';
    $params = [];

    if ($role !== '' && in_array($role, allowedUserRoles(), true)) {
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

    $countStmt = $db->prepare("SELECT COUNT(*) FROM users $where");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    // LIMIT/OFFSET must be integers in SQL — MySQL native prepared statements reject bound LIMIT params.
    $sql = "SELECT id, fullname, email, phone, address, role, created_at
            FROM users $where ORDER BY fullname ASC LIMIT $limit OFFSET $offset";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $users = array_map('formatUser', $stmt->fetchAll());

    successResponse([
        'users' => $users,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => $total > 0 ? (int) ceil($total / $limit) : 0,
        ],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getJsonInput();
    $errors = validateAdminUserCreate($data);
    if (!empty($errors)) {
        errorResponse('Validation failed.', 422, $errors);
    }

    $email = strtolower(trim($data['email']));
    $check = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        errorResponse('This email is already registered.', 409, ['email' => 'This email is already in use.']);
    }

    $role = strtolower(trim((string) ($data['role'] ?? 'user')));
    $hash = password_hash($data['password'], PASSWORD_DEFAULT);

    $stmt = $db->prepare(
        'INSERT INTO users (fullname, email, phone, address, password, role) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        trim($data['fullname']),
        $email,
        trim($data['phone']),
        trim($data['address'] ?? ''),
        $hash,
        $role,
    ]);

    $id = (int) $db->lastInsertId();
    $fetch = $db->prepare(
        'SELECT id, fullname, email, phone, address, role, created_at FROM users WHERE id = ? LIMIT 1'
    );
    $fetch->execute([$id]);

    successResponse(['user' => formatUser($fetch->fetch())], 'User created.', 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = getJsonInput();
    $errors = validateAdminUserUpdate($data);
    if (!empty($errors)) {
        errorResponse('Validation failed.', 422, $errors);
    }

    $id = (int) $data['id'];
    $stmt = $db->prepare('SELECT id, fullname, email, phone, address, role, password FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        errorResponse('User not found.', 404);
    }

    $newRole = isset($data['role'])
        ? strtolower(trim((string) $data['role']))
        : $existing['role'];

    if ($existing['role'] === 'admin' && $newRole !== 'admin' && countAdmins($db) <= 1) {
        errorResponse('Cannot change role of the last admin account.', 403);
    }

    $email = isset($data['email'])
        ? strtolower(trim((string) $data['email']))
        : $existing['email'];

    $dup = $db->prepare('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1');
    $dup->execute([$email, $id]);
    if ($dup->fetch()) {
        errorResponse('This email is already in use.', 409, ['email' => 'This email is already in use.']);
    }

    $fullname = isset($data['fullname']) ? trim((string) $data['fullname']) : $existing['fullname'];
    $phone = isset($data['phone']) ? trim((string) $data['phone']) : $existing['phone'];
    $address = isset($data['address']) ? trim((string) $data['address']) : ($existing['address'] ?? '');

    $passwordSql = '';
    $params = [$fullname, $email, $phone, $address, $newRole];

    if (!empty($data['password'])) {
        $passwordSql = ', password = ?';
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    $params[] = $id;
    $update = $db->prepare(
        "UPDATE users SET fullname = ?, email = ?, phone = ?, address = ?, role = ?$passwordSql WHERE id = ?"
    );
    $update->execute($params);

    if ($id === (int) $auth['user_id']) {
        setUserSession([
            'id' => $id,
            'fullname' => $fullname,
            'email' => $email,
            'phone' => $phone,
            'address' => $address,
            'role' => $newRole,
        ]);
    }

    $fetch = $db->prepare(
        'SELECT id, fullname, email, phone, address, role, created_at FROM users WHERE id = ? LIMIT 1'
    );
    $fetch->execute([$id]);

    successResponse(['user' => formatUser($fetch->fetch())], 'User updated.');
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        errorResponse('User id is required.', 422);
    }

    if ($id === (int) $auth['user_id']) {
        errorResponse('You cannot delete your own account.', 403);
    }

    $stmt = $db->prepare('SELECT id, role FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        errorResponse('User not found.', 404);
    }

    if ($existing['role'] === 'admin' && countAdmins($db) <= 1) {
        errorResponse('Cannot delete the last admin account.', 403);
    }

    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    successResponse(null, 'User deleted.');
}

errorResponse('Method not allowed.', 405);
