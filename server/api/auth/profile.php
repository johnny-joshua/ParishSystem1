<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    errorResponse('Method not allowed.', 405);
}

$auth = requireAuth();
$data = getJsonInput();
$db = getDB();
$userId = (int) $auth['user_id'];

$stmt = $db->prepare('SELECT id, fullname, email, phone, address, password, role FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$userId]);
$existing = $stmt->fetch();

if (!$existing) {
    destroyUserSession();
    errorResponse('Session invalid. Please log in again.', 401);
}

$newPassword = (string) ($data['new_password'] ?? $data['password'] ?? '');
$changingPassword = $newPassword !== '' || !empty($data['current_password']);

if ($changingPassword) {
    $errors = validatePasswordChange($data);
    if (!empty($errors)) {
        errorResponse('Validation failed.', 422, $errors);
    }

    if (!password_verify($data['current_password'], $existing['password'])) {
        errorResponse('Current password is incorrect.', 422, ['current_password' => 'Current password is incorrect.']);
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $update = $db->prepare('UPDATE users SET password = ? WHERE id = ?');
    $update->execute([$hash, $userId]);

    successResponse(null, 'Password updated successfully.');
}

$errors = validateProfileUpdate($data, $existing);
if (!empty($errors)) {
    errorResponse('Validation failed.', 422, $errors);
}

$email = strtolower(trim((string) ($data['email'] ?? $existing['email'])));
$check = $db->prepare('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1');
$check->execute([$email, $userId]);
if ($check->fetch()) {
    errorResponse('This email is already in use.', 409);
}

$fullname = trim((string) ($data['fullname'] ?? $existing['fullname']));
$phone = trim((string) ($data['phone'] ?? $existing['phone']));
$address = trim((string) ($data['address'] ?? $existing['address'] ?? ''));

$update = $db->prepare(
    'UPDATE users SET fullname = ?, email = ?, phone = ?, address = ? WHERE id = ?'
);
$update->execute([$fullname, $email, $phone, $address, $userId]);

$user = [
    'id' => $userId,
    'fullname' => $fullname,
    'email' => $email,
    'phone' => $phone,
    'address' => $address,
    'role' => $existing['role'],
];

setUserSession($user);

$stmt = $db->prepare(
    'SELECT id, fullname, email, phone, address, role, created_at FROM users WHERE id = ? LIMIT 1'
);
$stmt->execute([$userId]);
$user = $stmt->fetch();

successResponse(['user' => $user], 'Profile updated successfully.');
