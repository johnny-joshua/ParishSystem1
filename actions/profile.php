<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(appUrl('profile.php'));
}

requireLogin();

if (!verifyCsrf()) {
    setFlash('danger', 'Invalid request. Please try again.');
    redirect(appUrl('profile.php'));
}

$action = $_POST['action'] ?? '';
$db = getDB();
$userId = (int) $_SESSION['user_id'];

$stmt = $db->prepare('SELECT id, fullname, email, phone, address, password, role FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    clearUserSession();
    setFlash('warning', 'Please log in to continue.');
    redirect(appUrl('auth/login.php'));
}

if ($action === 'change_password') {
    $current = $_POST['current_password'] ?? '';
    $new = $_POST['new_password'] ?? '';
    $confirm = $_POST['confirm_password'] ?? '';

    if ($current === '' || $new === '' || $confirm === '') {
        setFlash('danger', 'All password fields are required.');
        redirect(appUrl('profile.php'));
    }

    if (strlen($new) < 8) {
        setFlash('danger', 'New password must be at least 8 characters.');
        redirect(appUrl('profile.php'));
    }

    if ($new !== $confirm) {
        setFlash('danger', 'New passwords do not match.');
        redirect(appUrl('profile.php'));
    }

    if (!password_verify($current, $user['password'])) {
        setFlash('danger', 'Current password is incorrect.');
        redirect(appUrl('profile.php'));
    }

    $hash = password_hash($new, PASSWORD_DEFAULT);
    $update = $db->prepare('UPDATE users SET password = ? WHERE id = ?');
    $update->execute([$hash, $userId]);

    setFlash('success', 'Password updated successfully.');
    redirect(appUrl('profile.php'));
}

if ($action === 'update_profile') {
    $fullname = trim($_POST['fullname'] ?? '');
    $email = strtolower(trim($_POST['email'] ?? ''));
    $phone = trim($_POST['phone'] ?? '');
    $address = trim($_POST['address'] ?? '');

    if ($fullname === '' || $email === '' || $phone === '') {
        setFlash('danger', 'Full name, email, and phone are required.');
        redirect(appUrl('profile.php'));
    }

    if (!validateEmail($email)) {
        setFlash('danger', 'Invalid email address.');
        redirect(appUrl('profile.php'));
    }

    $check = $db->prepare('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1');
    $check->execute([$email, $userId]);
    if ($check->fetch()) {
        setFlash('danger', 'This email is already in use.');
        redirect(appUrl('profile.php'));
    }

    $update = $db->prepare(
        'UPDATE users SET fullname = ?, email = ?, phone = ?, address = ? WHERE id = ?'
    );
    $update->execute([$fullname, $email, $phone, $address, $userId]);

    setUserSession([
        'id' => $userId,
        'fullname' => $fullname,
        'email' => $email,
        'role' => $user['role'],
    ]);

    setFlash('success', 'Profile updated successfully.');
    redirect(appUrl('profile.php'));
}

setFlash('danger', 'Invalid action.');
redirect(appUrl('profile.php'));
