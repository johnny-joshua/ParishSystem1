<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

requireUser();

$db = getDB();
$userId = (int) $_SESSION['user_id'];

$stmt = $db->prepare(
    'SELECT * FROM reservations WHERE user_id = ? ORDER BY created_at DESC'
);
$stmt->execute([$userId]);
$reservations = $stmt->fetchAll();

$pageTitle = 'Reservations — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';
?>

<div class="row g-4">
    <div class="col-lg-5">
        <div class="card card-panel">
            <div class="card-header">New Reservation</div>
            <div class="card-body">
                <form method="post" action="<?= e(appUrl('actions/reservation.php')) ?>">
                    <?= csrfField() ?>
                    <input type="hidden" name="action" value="create">
                    <div class="mb-3">
                        <label for="service_type" class="form-label">Service Type <span class="text-danger">*</span></label>
                        <select class="form-select" id="service_type" name="service_type" required>
                            <option value="">Select service</option>
                            <?php foreach (serviceTypes() as $type): ?>
                                <option value="<?= e($type) ?>"><?= e($type) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="reservation_date" class="form-label">Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control" id="reservation_date" name="reservation_date"
                               data-min-today required>
                    </div>
                    <div class="mb-3">
                        <label for="reservation_time" class="form-label">Time <span class="text-danger">*</span></label>
                        <input type="time" class="form-control" id="reservation_time" name="reservation_time" required>
                    </div>
                    <div class="mb-3">
                        <label for="requirements" class="form-label">Requirements / Notes</label>
                        <textarea class="form-control" id="requirements" name="requirements" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn btn-parish-primary w-100">Submit Reservation</button>
                </form>
            </div>
        </div>
    </div>
    <div class="col-lg-7">
        <div class="card card-panel">
            <div class="card-header">My Reservations</div>
            <div class="card-body p-0">
                <?php if (empty($reservations)): ?>
                    <p class="p-4 text-muted mb-0">No reservations yet.</p>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($reservations as $row): ?>
                                    <tr>
                                        <td><?= e($row['service_type']) ?></td>
                                        <td><?= formatDate($row['reservation_date']) ?></td>
                                        <td><?= formatTime($row['reservation_time']) ?></td>
                                        <td>
                                            <span class="badge bg-<?= statusBadgeClass($row['status']) ?>">
                                                <?= e($row['status']) ?>
                                            </span>
                                        </td>
                                    </tr>
                                    <?php if ($row['remarks']): ?>
                                        <tr>
                                            <td colspan="4" class="small text-muted border-0 pt-0">
                                                Remarks: <?= e($row['remarks']) ?>
                                            </td>
                                        </tr>
                                    <?php endif; ?>
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
