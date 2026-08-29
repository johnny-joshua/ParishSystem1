<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdmin();

$db = getDB();

$stats = [
    'pending_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Pending'")->fetchColumn(),
    'pending_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")->fetchColumn(),
    'total_records' => (int) $db->query('SELECT COUNT(*) FROM parish_records')->fetchColumn(),
    'total_users' => (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn(),
];

$pageTitle = 'Admin Dashboard — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';
?>

<h1 class="h3 mb-4">Administrator Dashboard</h1>

<div class="row g-3 mb-4">
    <div class="col-md-3 col-6">
        <div class="card stat-card">
            <div class="card-body">
                <div class="text-muted small">Pending Reservations</div>
                <div class="display-6 fw-bold text-warning"><?= $stats['pending_reservations'] ?></div>
            </div>
        </div>
    </div>
    <div class="col-md-3 col-6">
        <div class="card stat-card">
            <div class="card-body">
                <div class="text-muted small">Pending Appointments</div>
                <div class="display-6 fw-bold text-warning"><?= $stats['pending_appointments'] ?></div>
            </div>
        </div>
    </div>
    <div class="col-md-3 col-6">
        <div class="card stat-card">
            <div class="card-body">
                <div class="text-muted small">Parish Records</div>
                <div class="display-6 fw-bold text-success"><?= $stats['total_records'] ?></div>
            </div>
        </div>
    </div>
    <div class="col-md-3 col-6">
        <div class="card stat-card">
            <div class="card-body">
                <div class="text-muted small">Registered Parishioners</div>
                <div class="display-6 fw-bold"><?= $stats['total_users'] ?></div>
            </div>
        </div>
    </div>
</div>

<div class="row g-3">
    <div class="col-md-4">
        <a href="<?= e(appUrl('admin/reservations.php')) ?>" class="text-decoration-none">
            <div class="card card-panel h-100">
                <div class="card-body">
                    <h2 class="h5"><i class="bi bi-calendar-check"></i> Manage Reservations</h2>
                    <p class="text-muted small mb-0">Approve, reject, or complete service bookings.</p>
                </div>
            </div>
        </a>
    </div>
    <div class="col-md-4">
        <a href="<?= e(appUrl('admin/appointments.php')) ?>" class="text-decoration-none">
            <div class="card card-panel h-100">
                <div class="card-body">
                    <h2 class="h5"><i class="bi bi-clock"></i> Manage Appointments</h2>
                    <p class="text-muted small mb-0">Review parishioner appointment requests.</p>
                </div>
            </div>
        </a>
    </div>
    <div class="col-md-4">
        <a href="<?= e(appUrl('admin/records.php')) ?>" class="text-decoration-none">
            <div class="card card-panel h-100">
                <div class="card-body">
                    <h2 class="h5"><i class="bi bi-journal-text"></i> Centralized Records</h2>
                    <p class="text-muted small mb-0">Digital sacramental and parish records.</p>
                </div>
            </div>
        </a>
    </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
