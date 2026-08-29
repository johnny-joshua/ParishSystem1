<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

successResponse([
    'authenticated' => isLoggedIn(),
    'role' => $_SESSION['role'] ?? null,
]);
