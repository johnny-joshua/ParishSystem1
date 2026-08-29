<?php

require_once __DIR__ . '/includes/init.php';
require_once __DIR__ . '/includes/auth.php';

if (isLoggedIn()) {
    if (isAdmin()) {
        redirect(appUrl('admin/dashboard.php'));
    }
    redirect(appUrl('parishioner/dashboard.php'));
}

$pageTitle = APP_NAME;
require __DIR__ . '/includes/header.php';
?>

<section class="hero-section text-center">
    <p class="text-uppercase small mb-2 opacity-75">Holy Family Parish · Putiao, Pilar, Sorsogon</p>
    <h1 class="mb-3">A Centralized Digital Record Management System for Holy Family Parish in Putiao, Pilar, Sorsogon</h1>
    <p class="lead mb-4 opacity-90 mx-auto" style="max-width: 42rem;">
        Manage parish services, appointments, and sacramental records in one secure, centralized platform.
    </p>
    <div class="d-flex flex-wrap justify-content-center gap-2">
        <a href="<?= e(appUrl('auth/login.php')) ?>" class="btn btn-parish-gold btn-lg px-4">Login</a>
        <a href="<?= e(appUrl('auth/register.php')) ?>" class="btn btn-outline-light btn-lg px-4">Register</a>
    </div>
</section>

<div class="row g-4 mb-4">
    <div class="col-md-4">
        <div class="card feature-card">
            <div class="card-body">
                <div class="feature-icon mb-3"><i class="bi bi-person-plus"></i></div>
                <h2 class="h5">Register & Login</h2>
                <p class="text-muted small mb-0">Parishioners create an account to access online services securely.</p>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card feature-card">
            <div class="card-body">
                <div class="feature-icon mb-3"><i class="bi bi-calendar-check"></i></div>
                <h2 class="h5">Reservations</h2>
                <p class="text-muted small mb-0">Book Marriage, Baptism, Funeral, Mass Intention, or Private Mass online.</p>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card feature-card">
            <div class="card-body">
                <div class="feature-icon mb-3"><i class="bi bi-clock"></i></div>
                <h2 class="h5">Appointments</h2>
                <p class="text-muted small mb-0">Request a meeting with the parish office and track approval status.</p>
            </div>
        </div>
    </div>
</div>

<div class="card card-panel">
    <div class="card-body text-center py-4">
        <div class="feature-icon mx-auto mb-3"><i class="bi bi-journal-text"></i></div>
        <h2 class="h5">Centralized Digital Records</h2>
        <p class="text-muted mb-0 mx-auto" style="max-width: 36rem;">
            Administrators maintain a unified archive of sacramental and parish records—linked to registered parishioners when applicable—for efficient, centralized management.
        </p>
    </div>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
