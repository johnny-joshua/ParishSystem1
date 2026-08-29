<?php

/**
 * LEGACY admin appointments page — read-only.
 *
 * Not used by the React/Vite application. Appointment management is handled by
 * client/src/pages/admin/AdminAppointments.jsx via server/api/appointments/index.php.
 * Status updates via this page are disabled to prevent unvalidated database writes.
 */

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdmin();

$db = getDB();
$filter = $_GET['status'] ?? 'Pending';
if (!in_array($filter, array_merge(['All'], reservationStatuses()), true)) {
    $filter = 'Pending';
}

$sql = 'SELECT a.*, u.fullname, u.email, u.phone
        FROM appointments a
        JOIN users u ON u.id = a.user_id';
$params = [];
if ($filter !== 'All') {
    $sql .= ' WHERE a.status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY a.created_at DESC';

$stmt = $db->prepare($sql);
$stmt->execute($params);
$appointments = $stmt->fetchAll();

$pageTitle = 'Manage Appointments — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';
?>

<div class="alert alert-warning" role="alert">
    <strong>Legacy page — actions disabled.</strong>
    Approve, reject, and cancel are no longer available here. Use the React parish
    application (Admin &gt; Appointments) so updates go through the validated API with
    notifications and SMS.
</div>

<div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
    <h1 class="h3 mb-0">Appointments</h1>
    <div class="btn-group flex-wrap">
        <?php foreach (array_merge(['All'], reservationStatuses()) as $status): ?>
            <a href="?status=<?= urlencode($status) ?>"
               class="btn btn-sm <?= $filter === $status ? 'btn-parish-primary' : 'btn-outline-secondary' ?>">
                <?= e($status) ?>
            </a>
        <?php endforeach; ?>
    </div>
</div>

<div class="card card-panel">
    <div class="card-body p-0">
        <?php if (empty($appointments)): ?>
            <p class="p-4 text-muted mb-0">No appointments found.</p>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover mb-0 align-middle">
                    <thead>
                        <tr>
                            <th>Parishioner</th>
                            <th>Date / Time</th>
                            <th>Purpose</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($appointments as $row): ?>
                            <tr>
                                <td>
                                    <strong><?= e($row['fullname']) ?></strong><br>
                                    <span class="small text-muted"><?= e($row['email']) ?> · <?= e($row['phone']) ?></span>
                                </td>
                                <td>
                                    <?= formatDate($row['appointment_date']) ?><br>
                                    <span class="small"><?= formatTime($row['appointment_time']) ?></span>
                                </td>
                                <td><?= e($row['purpose']) ?></td>
                                <td>
                                    <span class="badge bg-<?= statusBadgeClass($row['status']) ?>">
                                        <?= e($row['status']) ?>
                                    </span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
