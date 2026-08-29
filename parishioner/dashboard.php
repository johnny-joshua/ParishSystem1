<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

requireUser();

$db = getDB();
$userId = (int) $_SESSION['user_id'];

$pendingRes = $db->prepare("SELECT COUNT(*) AS c FROM reservations WHERE user_id = ? AND status = 'Pending'");
$pendingRes->execute([$userId]);
$pendingResCount = (int) $pendingRes->fetch()['c'];

$pendingAppt = $db->prepare("SELECT COUNT(*) AS c FROM appointments WHERE user_id = ? AND status = 'Pending'");
$pendingAppt->execute([$userId]);
$pendingApptCount = (int) $pendingAppt->fetch()['c'];

$approvedRes = $db->prepare("SELECT COUNT(*) AS c FROM reservations WHERE user_id = ? AND status = 'Approved'");
$approvedRes->execute([$userId]);
$approvedResCount = (int) $approvedRes->fetch()['c'];

$pageTitle = 'Dashboard — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';
$user = currentUser();
?>

<h1 class="h3 mb-4">Welcome, <?= e($user['fullname']) ?></h1>

<div class="row g-3 mb-4">
    <div class="col-md-4">
        <div class="card stat-card">
            <div class="card-body">
                <div class="text-muted small">Pending Reservations</div>
                <div class="display-6 fw-bold text-warning"><?= $pendingResCount ?></div>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card stat-card">
            <div class="card-body">
                <div class="text-muted small">Pending Appointments</div>
                <div class="display-6 fw-bold text-warning"><?= $pendingApptCount ?></div>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card stat-card">
            <div class="card-body">
                <div class="text-muted small">Approved Reservations</div>
                <div class="display-6 fw-bold text-success"><?= $approvedResCount ?></div>
            </div>
        </div>
    </div>
</div>

<div class="row g-3">
    <div class="col-md-6">
        <div class="card card-panel h-100">
            <div class="card-body">
                <h2 class="h5"><i class="bi bi-calendar-check text-warning"></i> Service Reservations</h2>
                <p class="text-muted small">Book Marriage, Baptism, Funeral, Mass Intention, or Private Mass.</p>
                <a href="<?= e(appUrl('parishioner/reservations.php')) ?>" class="btn btn-parish-primary">Manage Reservations</a>
            </div>
        </div>
    </div>
    <div class="col-md-6">
        <div class="card card-panel h-100">
            <div class="card-body">
                <h2 class="h5"><i class="bi bi-clock text-warning"></i> Appointments</h2>
                <p class="text-muted small">Schedule a meeting with the parish office.</p>
                <a href="<?= e(appUrl('parishioner/appointments.php')) ?>" class="btn btn-parish-primary">Manage Appointments</a>
            </div>
        </div>
    </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
