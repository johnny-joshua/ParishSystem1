<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdmin();

$db = getDB();
$filter = $_GET['status'] ?? 'Pending';
if (!in_array($filter, array_merge(['All'], reservationStatuses()), true)) {
    $filter = 'Pending';
}

$sql = 'SELECT r.*, u.fullname, u.email, u.phone
        FROM reservations r
        JOIN users u ON u.id = r.user_id';
$params = [];
if ($filter !== 'All') {
    $sql .= ' WHERE r.status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY r.created_at DESC';

$stmt = $db->prepare($sql);
$stmt->execute($params);
$reservations = $stmt->fetchAll();

$pageTitle = 'Manage Reservations — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';
?>

<div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
    <h1 class="h3 mb-0">Reservations</h1>
    <div class="btn-group">
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
        <?php if (empty($reservations)): ?>
            <p class="p-4 text-muted mb-0">No reservations found.</p>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover mb-0 align-middle">
                    <thead>
                        <tr>
                            <th>Parishioner</th>
                            <th>Service</th>
                            <th>Date / Time</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($reservations as $row): ?>
                            <tr>
                                <td>
                                    <strong><?= e($row['fullname']) ?></strong><br>
                                    <span class="small text-muted"><?= e($row['email']) ?></span>
                                </td>
                                <td><?= e($row['service_type']) ?></td>
                                <td>
                                    <?= formatDate($row['reservation_date']) ?><br>
                                    <span class="small"><?= formatTime($row['reservation_time']) ?></span>
                                </td>
                                <td>
                                    <span class="badge bg-<?= statusBadgeClass($row['status']) ?>">
                                        <?= e($row['status']) ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if ($row['status'] === 'Pending'): ?>
                                        <form method="post" action="<?= e(appUrl('actions/reservation.php')) ?>" class="d-inline">
                                            <?= csrfField() ?>
                                            <input type="hidden" name="action" value="update_status">
                                            <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                                            <input type="hidden" name="status" value="Approved">
                                            <input type="hidden" name="filter" value="<?= e($filter) ?>">
                                            <button type="submit" class="btn btn-sm btn-success">Approve</button>
                                        </form>
                                        <button type="button" class="btn btn-sm btn-danger"
                                                data-bs-toggle="modal"
                                                data-bs-target="#rejectModal<?= (int) $row['id'] ?>">Reject</button>
                                    <?php elseif ($row['status'] === 'Approved'): ?>
                                        <form method="post" action="<?= e(appUrl('actions/reservation.php')) ?>" class="d-inline">
                                            <?= csrfField() ?>
                                            <input type="hidden" name="action" value="update_status">
                                            <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                                            <input type="hidden" name="status" value="Completed">
                                            <input type="hidden" name="filter" value="<?= e($filter) ?>">
                                            <button type="submit" class="btn btn-sm btn-info text-white">Complete</button>
                                        </form>
                                    <?php else: ?>
                                        <span class="text-muted small">—</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                            <?php if ($row['requirements']): ?>
                                <tr>
                                    <td colspan="5" class="small text-muted border-0 pt-0">
                                        Requirements: <?= e($row['requirements']) ?>
                                    </td>
                                </tr>
                            <?php endif; ?>
                            <?php if ($row['remarks']): ?>
                                <tr>
                                    <td colspan="5" class="small text-muted border-0 pt-0">
                                        Remarks: <?= e($row['remarks']) ?>
                                    </td>
                                </tr>
                            <?php endif; ?>

                            <div class="modal fade" id="rejectModal<?= (int) $row['id'] ?>" tabindex="-1">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <form method="post" action="<?= e(appUrl('actions/reservation.php')) ?>">
                                            <?= csrfField() ?>
                                            <input type="hidden" name="action" value="update_status">
                                            <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                                            <input type="hidden" name="status" value="Rejected">
                                            <input type="hidden" name="filter" value="<?= e($filter) ?>">
                                            <div class="modal-header">
                                                <h5 class="modal-title">Reject Reservation</h5>
                                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body">
                                                <label class="form-label">Remarks (optional)</label>
                                                <textarea class="form-control" name="remarks" rows="3"></textarea>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                                <button type="submit" class="btn btn-danger">Reject</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
