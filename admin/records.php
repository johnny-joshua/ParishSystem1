<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdmin();

$db = getDB();

$searchQ = trim($_GET['q'] ?? '');
$searchService = trim($_GET['service'] ?? '');
$searchFrom = $_GET['from'] ?? '';
$searchTo = $_GET['to'] ?? '';
$editId = isset($_GET['edit']) ? (int) $_GET['edit'] : 0;

$sql = 'SELECT pr.*, u.fullname AS parishioner_name
        FROM parish_records pr
        LEFT JOIN users u ON u.id = pr.user_id
        WHERE 1=1';
$params = [];

if ($searchQ !== '') {
    $sql .= ' AND (pr.details LIKE ? OR u.fullname LIKE ? OR pr.service_type LIKE ?)';
    $like = '%' . $searchQ . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
if ($searchService !== '') {
    $sql .= ' AND pr.service_type LIKE ?';
    $params[] = '%' . $searchService . '%';
}
if ($searchFrom !== '') {
    $sql .= ' AND DATE(pr.created_at) >= ?';
    $params[] = $searchFrom;
}
if ($searchTo !== '') {
    $sql .= ' AND DATE(pr.created_at) <= ?';
    $params[] = $searchTo;
}
$sql .= ' ORDER BY pr.created_at DESC';

$stmt = $db->prepare($sql);
$stmt->execute($params);
$records = $stmt->fetchAll();

$editRecord = null;
if ($editId > 0) {
    $stmt = $db->prepare('SELECT * FROM parish_records WHERE id = ? LIMIT 1');
    $stmt->execute([$editId]);
    $editRecord = $stmt->fetch();
}

$parishioners = $db->query("SELECT id, fullname, email FROM users WHERE role = 'user' ORDER BY fullname")->fetchAll();

$pageTitle = 'Centralized Records — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';

$searchHidden = function () use ($searchQ, $searchService, $searchFrom, $searchTo) {
    echo '<input type="hidden" name="search_q" value="' . e($searchQ) . '">';
    echo '<input type="hidden" name="search_service" value="' . e($searchService) . '">';
    echo '<input type="hidden" name="search_from" value="' . e($searchFrom) . '">';
    echo '<input type="hidden" name="search_to" value="' . e($searchTo) . '">';
};
?>

<h1 class="h3 mb-4">Centralized Digital Records</h1>

<div class="row g-4">
    <div class="col-lg-4">
        <div class="card card-panel">
            <div class="card-header"><?= $editRecord ? 'Edit Record' : 'New Record' ?></div>
            <div class="card-body">
                <form method="post" action="<?= e(appUrl('actions/record.php')) ?>">
                    <?= csrfField() ?>
                    <input type="hidden" name="action" value="<?= $editRecord ? 'update' : 'create' ?>">
                    <?php if ($editRecord): ?>
                        <input type="hidden" name="id" value="<?= (int) $editRecord['id'] ?>">
                    <?php endif; ?>
                    <?php $searchHidden(); ?>
                    <div class="mb-3">
                        <label for="service_type" class="form-label">Service Type <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="service_type" name="service_type" required
                               list="serviceTypeList"
                               value="<?= e($editRecord['service_type'] ?? '') ?>"
                               placeholder="e.g. Baptism, Marriage">
                        <datalist id="serviceTypeList">
                            <?php foreach (serviceTypes() as $type): ?>
                                <option value="<?= e($type) ?>">
                            <?php endforeach; ?>
                        </datalist>
                    </div>
                    <div class="mb-3">
                        <label for="user_id" class="form-label">Link to Parishioner</label>
                        <select class="form-select" id="user_id" name="user_id">
                            <option value="">— None —</option>
                            <?php foreach ($parishioners as $p): ?>
                                <option value="<?= (int) $p['id'] ?>"
                                    <?= ($editRecord && (int) $editRecord['user_id'] === (int) $p['id']) ? 'selected' : '' ?>>
                                    <?= e($p['fullname']) ?> (<?= e($p['email']) ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="details" class="form-label">Record Details <span class="text-danger">*</span></label>
                        <textarea class="form-control" id="details" name="details" rows="5" required><?= e($editRecord['details'] ?? '') ?></textarea>
                    </div>
                    <button type="submit" class="btn btn-parish-primary w-100">
                        <?= $editRecord ? 'Update Record' : 'Save Record' ?>
                    </button>
                    <?php if ($editRecord): ?>
                        <a href="<?= e(appUrl('admin/records.php?' . http_build_query(array_filter([
                            'q' => $searchQ,
                            'service' => $searchService,
                            'from' => $searchFrom,
                            'to' => $searchTo,
                        ])))) ?>" class="btn btn-link w-100 mt-2">Cancel edit</a>
                    <?php endif; ?>
                </form>
            </div>
        </div>
    </div>
    <div class="col-lg-8">
        <div class="card card-panel mb-3">
            <div class="card-header">Search Records</div>
            <div class="card-body">
                <form method="get" class="row g-2">
                    <div class="col-md-6">
                        <input type="text" class="form-control" name="q" placeholder="Keyword (name, details...)"
                               value="<?= e($searchQ) ?>">
                    </div>
                    <div class="col-md-6">
                        <input type="text" class="form-control" name="service" placeholder="Service type"
                               value="<?= e($searchService) ?>">
                    </div>
                    <div class="col-md-4">
                        <input type="date" class="form-control" name="from" value="<?= e($searchFrom) ?>" placeholder="From">
                    </div>
                    <div class="col-md-4">
                        <input type="date" class="form-control" name="to" value="<?= e($searchTo) ?>" placeholder="To">
                    </div>
                    <div class="col-md-4">
                        <button type="submit" class="btn btn-parish-primary w-100">Search</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="card card-panel">
            <div class="card-header">Record Archive (<?= count($records) ?>)</div>
            <div class="card-body p-0">
                <?php if (empty($records)): ?>
                    <p class="p-4 text-muted mb-0">No records found.</p>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>Parishioner</th>
                                    <th>Details</th>
                                    <th>Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($records as $row): ?>
                                    <tr>
                                        <td><?= e($row['service_type']) ?></td>
                                        <td><?= e($row['parishioner_name'] ?? '—') ?></td>
                                        <td class="small"><?php
                                            $d = $row['details'];
                                            echo e(strlen($d) > 80 ? substr($d, 0, 80) . '…' : $d);
                                        ?></td>
                                        <td class="small"><?= formatDate(substr($row['created_at'], 0, 10)) ?></td>
                                        <td class="text-nowrap">
                                            <a href="?<?= e(http_build_query([
                                                'edit' => $row['id'],
                                                'q' => $searchQ,
                                                'service' => $searchService,
                                                'from' => $searchFrom,
                                                'to' => $searchTo,
                                            ])) ?>" class="btn btn-sm btn-outline-primary">Edit</a>
                                            <form method="post" action="<?= e(appUrl('actions/record.php')) ?>" class="d-inline">
                                                <?= csrfField() ?>
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                                                <?php $searchHidden(); ?>
                                                <button type="submit" class="btn btn-sm btn-outline-danger"
                                                        data-confirm="Delete this record permanently?">Delete</button>
                                            </form>
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
