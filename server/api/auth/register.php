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
$fullname = trim((string) $data['fullname']);
$email = strtolower(trim($data['email']));
$phone = trim((string) $data['phone']);

// Serialize equivalent registrations so the duplicate checks and insert are atomic.
$lockNames = [
    'email:' . hash('sha256', $email),
    'name:' . hash('sha256', normalizeRegistrationName($fullname)),
    'phone:' . hash('sha256', normalizeRegistrationPhone($phone)),
];
sort($lockNames, SORT_STRING);
$acquiredLocks = [];
foreach ($lockNames as $lockName) {
    $lock = $db->prepare('SELECT GET_LOCK(?, 10)');
    $lock->execute([$lockName]);
    if ((int) $lock->fetchColumn() !== 1) {
        foreach ($acquiredLocks as $acquiredLock) {
            $db->query('SELECT RELEASE_LOCK(' . $db->quote($acquiredLock) . ')');
        }
        errorResponse('Registration is busy. Please try again.', 409);
    }
    $acquiredLocks[] = $lockName;
}

$check = $db->query("SELECT fullname, phone, email FROM users WHERE role = 'user'");
$duplicateErrors = [];
foreach ($check->fetchAll() as $existing) {
    if (normalizeRegistrationName($existing['fullname']) === normalizeRegistrationName($fullname)) {
        $duplicateErrors['fullname'] = 'Name is already used.';
    }
    if (normalizeRegistrationPhone($existing['phone']) === normalizeRegistrationPhone($phone)) {
        $duplicateErrors['phone'] = 'Phone number is already used.';
    }
    if (strtolower(trim((string) $existing['email'])) === $email) {
        $duplicateErrors['email'] = 'This email is already registered.';
    }
}
if (!empty($duplicateErrors)) {
    foreach ($acquiredLocks as $acquiredLock) {
        $db->query('SELECT RELEASE_LOCK(' . $db->quote($acquiredLock) . ')');
    }
    errorResponse('Registration details are already in use.', 409, $duplicateErrors);
}

$hash = password_hash($data['password'], PASSWORD_DEFAULT);

$stmt = $db->prepare(
    'INSERT INTO users (fullname, email, phone, address, password, role) VALUES (?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $fullname,
    $email,
    $phone,
    trim($data['address'] ?? ''),
    $hash,
    'user',
]);

$user = [
    'id' => (int) $db->lastInsertId(),
    'fullname' => $fullname,
    'email' => $email,
    'phone' => $phone,
    'address' => trim($data['address'] ?? ''),
    'role' => 'user',
];

foreach ($acquiredLocks as $acquiredLock) {
    $db->query('SELECT RELEASE_LOCK(' . $db->quote($acquiredLock) . ')');
}

// Registration only creates the account; the parishioner must log in separately.
successResponse(['user' => $user], 'Registration successful.', 201);
