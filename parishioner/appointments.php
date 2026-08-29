<?php

/**
 * LEGACY parishioner appointments page — read-only.
 *
 * Not used by the React/Vite application. Appointment booking is handled by
 * client/src/pages/Appointment.jsx via server/api/appointments/index.php.
 * Creation via this page is disabled to prevent unvalidated database writes.
 */

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

requireUser();

$db = getDB();
$userId = (int) $_SESSION['user_id'];

$stmt = $db->prepare('SELECT * FROM appointments WHERE user_id = ? ORDER BY created_at DESC');
$stmt->execute([$userId]);
$appointments = $stmt->fetchAll();

$pageTitle = 'Appointments — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';
?>

<div class="alert alert-warning" role="alert">
    <strong>Legacy page — booking disabled.</strong>
    This page no longer accepts appointment requests. Use the React parish application
    (Appointments) to book with validated office hours, slot availability, and notifications.
</div>

<div class="row g-4">
    <div class="col-12">
        <div class="card card-panel">
            <div class="card-header">My Appointments</div>
            <div class="card-body p-0">
                <?php if (empty($appointments)): ?>
                    <p class="p-4 text-muted mb-0">No appointments yet.</p>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Purpose</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($appointments as $row): ?>
                                    <tr>
                                        <td><?= formatDate($row['appointment_date']) ?></td>
                                        <td><?= formatTime($row['appointment_time']) ?></td>
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
    </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
