<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed.', 405);
}

$data = getJsonInput();

if (!empty($data['role']) && strtolower(trim($data['role'])) !== 'user') {
    errorResponse('Admin accounts cannot be created through registration.', 403);
}

$errors = validateRegistration($data);
if (!empty($errors)) {
    errorResponse('Validation failed.', 422, $errors);
}

$db = getDB();
$email = strtolower(trim($data['email']));

$check = $db->prepare('SELECT id FROM users WHERE email = ?');
$check->execute([$email]);
if ($check->fetch()) {
    errorResponse('This email is already registered.', 409);
}

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
    'user',
]);

$user = [
    'id' => (int) $db->lastInsertId(),
    'fullname' => trim($data['fullname']),
    'email' => $email,
    'phone' => trim($data['phone']),
    'address' => trim($data['address'] ?? ''),
    'role' => 'user',
];

setUserSession($user);

successResponse(['user' => $user], 'Registration successful.', 201);
