<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

// Return document requirements configuration
$requirements = require __DIR__ . '/../../config/document_requirements.php';

successResponse($requirements, 'Document requirements retrieved.');
