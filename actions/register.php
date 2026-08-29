<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(appUrl('auth/register.php'));
}

if (!verifyCsrf()) {
    setFlash('danger', 'Invalid request. Please try again.');
    redirect(appUrl('auth/register.php'));
}

$fullname = trim($_POST['fullname'] ?? '');
$email = strtolower(trim($_POST['email'] ?? ''));
$phone = trim($_POST['phone'] ?? '');
$address = trim($_POST['address'] ?? '');
$password = $_POST['password'] ?? '';
$confirm = $_POST['confirm_password'] ?? '';

if ($fullname === '' || $email === '' || $phone === '' || $password === '') {
    setFlash('danger', 'Please fill in all required fields.');
    redirect(appUrl('auth/register.php'));
}

if (!validateEmail($email)) {
    setFlash('danger', 'Invalid email address.');
    redirect(appUrl('auth/register.php'));
}

if (strlen($password) < 8) {
    setFlash('danger', 'Password must be at least 8 characters.');
    redirect(appUrl('auth/register.php'));
}

if ($password !== $confirm) {
    setFlash('danger', 'Passwords do not match.');
    redirect(appUrl('auth/register.php'));
}

$db = getDB();
$stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    setFlash('danger', 'An account with this email already exists.');
    redirect(appUrl('auth/register.php'));
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $db->prepare(
    'INSERT INTO users (fullname, email, phone, address, password, role) VALUES (?, ?, ?, ?, ?, ?)'
);
$stmt->execute([$fullname, $email, $phone, $address ?: null, $hash, 'user']);

setFlash('success', 'Registration successful. You may now log in.');
redirect(appUrl('auth/login.php'));
