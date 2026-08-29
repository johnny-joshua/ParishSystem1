<?php

if (session_status() === PHP_SESSION_NONE) {
    $lifetime = (int) (getenv('SESSION_LIFETIME') ?: 86400);

    session_set_cookie_params([
        'lifetime' => $lifetime,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => false,
    ]);

    session_name('HF_PARISH_SESSION');
    session_start();

    if (isset($_SESSION['last_activity']) && time() - $_SESSION['last_activity'] > $lifetime) {
        $_SESSION = [];
        session_destroy();
        session_start();
    }
    $_SESSION['last_activity'] = time();
}

function setUserSession(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['fullname'] = $user['fullname'];
    $_SESSION['last_activity'] = time();
}

function destroyUserSession(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function isLoggedIn(): bool
{
    return !empty($_SESSION['user_id']);
}
