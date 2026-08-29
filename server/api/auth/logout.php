<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed.', 405);
}

destroyUserSession();

successResponse(null, 'Logged out successfully.');
