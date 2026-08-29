<?php
$user = currentUser();
$isAdminNav = $user && $user['role'] === 'admin';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($pageTitle ?? APP_NAME) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link href="<?= e(appUrl('assets/css/style.css')) ?>" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark parish-navbar">
    <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2" href="<?= e(appUrl('index.php')) ?>">
            <i class="bi bi-building"></i>
            <span class="brand-text">Holy Family Parish</span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1">
                <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('index.php')) ?>">Home</a></li>
                <?php if ($user): ?>
                    <?php if ($isAdminNav): ?>
                        <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('admin/dashboard.php')) ?>">Dashboard</a></li>
                        <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('admin/reservations.php')) ?>">Reservations</a></li>
                        <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('admin/appointments.php')) ?>">Appointments</a></li>
                        <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('admin/records.php')) ?>">Records</a></li>
                    <?php else: ?>
                        <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('parishioner/dashboard.php')) ?>">Dashboard</a></li>
                        <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('parishioner/reservations.php')) ?>">Reservations</a></li>
                        <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('parishioner/appointments.php')) ?>">Appointments</a></li>
                    <?php endif; ?>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-person-circle"></i> <?= e($user['fullname']) ?>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><span class="dropdown-item-text small text-muted"><?= e($user['email']) ?></span></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="<?= e(appUrl('profile.php')) ?>"><i class="bi bi-person me-2"></i>My Profile</a></li>
                            <li><a class="dropdown-item" href="<?= e(appUrl('auth/logout.php')) ?>"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
                        </ul>
                    </li>
                <?php else: ?>
                    <li class="nav-item"><a class="nav-link" href="<?= e(appUrl('auth/login.php')) ?>">Login</a></li>
                    <li class="nav-item"><a class="btn btn-parish-gold btn-sm ms-lg-2" href="<?= e(appUrl('auth/register.php')) ?>">Register</a></li>
                <?php endif; ?>
            </ul>
        </div>
    </div>
</nav>
<main class="page-main">
    <div class="container py-4">
        <?php require __DIR__ . '/flash.php'; ?>
