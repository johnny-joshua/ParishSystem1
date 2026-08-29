<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

setFlash('success', 'You have been logged out.');
if (isLoggedIn()) {
    unset($_SESSION['user_id'], $_SESSION['fullname'], $_SESSION['email'], $_SESSION['role']);
}
redirect(appUrl('index.php'));
