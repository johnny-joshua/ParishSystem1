<?php

function isLoggedIn(): bool
{
    return !empty($_SESSION['user_id']);
}

function currentUser(): ?array
{
    if (!isLoggedIn()) {
        return null;
    }
    return [
        'id' => (int) $_SESSION['user_id'],
        'fullname' => $_SESSION['fullname'] ?? '',
        'email' => $_SESSION['email'] ?? '',
        'role' => $_SESSION['role'] ?? 'user',
    ];
}

function isAdmin(): bool
{
    return isLoggedIn() && ($_SESSION['role'] ?? '') === 'admin';
}

function setUserSession(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['fullname'] = $user['fullname'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role'] = $user['role'];
}

function clearUserSession(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function requireLogin(): void
{
    if (!isLoggedIn()) {
        setFlash('warning', 'Please log in to continue.');
        redirect(appUrl('auth/login.php'));
    }
}

function requireAdmin(): void
{
    requireLogin();
    if (!isAdmin()) {
        setFlash('danger', 'Access denied. Administrators only.');
        redirect(appUrl('parishioner/dashboard.php'));
    }
}

function requireUser(): void
{
    requireLogin();
    if (isAdmin()) {
        redirect(appUrl('admin/dashboard.php'));
    }
}

function guestOnly(): void
{
    if (!isLoggedIn()) {
        return;
    }
    if (isAdmin()) {
        redirect(appUrl('admin/dashboard.php'));
    }
    redirect(appUrl('parishioner/dashboard.php'));
}
