<?php

require_once __DIR__ . '/../utils/response.php';

function requireAuth(): array
{
    if (empty($_SESSION['user_id'])) {
        errorResponse('Authentication required. Please log in.', 401);
    }

    return [
        'user_id' => (int) $_SESSION['user_id'],
        'role' => $_SESSION['role'] ?? 'user',
        'email' => $_SESSION['email'] ?? '',
        'fullname' => $_SESSION['fullname'] ?? '',
    ];
}

function requireAdmin(): array
{
    $user = requireAuth();
    if (($user['role'] ?? '') !== 'admin') {
        errorResponse('Admin access required.', 403);
    }
    return $user;
}

function requireUser(): array
{
    $user = requireAuth();
    if (($user['role'] ?? '') === 'admin') {
        errorResponse('This action is for parishioner accounts only.', 403);
    }
    return $user;
}
