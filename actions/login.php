<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(appUrl('auth/login.php'));
}

if (!verifyCsrf()) {
    setFlash('danger', 'Invalid request. Please try again.');
    redirect(appUrl('auth/login.php'));
}

$email = strtolower(trim($_POST['email'] ?? ''));
$password = $_POST['password'] ?? '';

if ($email === '' || $password === '') {
    setFlash('danger', 'Email and password are required.');
    redirect(appUrl('auth/login.php'));
}

if (!validateEmail($email)) {
    setFlash('danger', 'Invalid email address.');
    redirect(appUrl('auth/login.php'));
}

$db = getDB();
$stmt = $db->prepare('SELECT id, fullname, email, password, role FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    setFlash('danger', 'Invalid email or password.');
    redirect(appUrl('auth/login.php'));
}

setUserSession($user);
setFlash('success', 'Welcome back, ' . $user['fullname'] . '!');

if ($user['role'] === 'admin') {
    redirect(appUrl('admin/dashboard.php'));
}
redirect(appUrl('parishioner/dashboard.php'));
