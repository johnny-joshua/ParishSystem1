<?php

if (session_status() === PHP_SESSION_NONE) {
    session_name('HF_PARISH_SESSION');
    session_start();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/functions.php';

define('APP_NAME', 'Holy Family Parish — Digital Record Management');
define('PARISH_LOCATION', 'Putiao, Pilar, Sorsogon');
