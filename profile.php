<?php

require_once __DIR__ . '/includes/init.php';
require_once __DIR__ . '/includes/auth.php';

requireLogin();

$db = getDB();
$stmt = $db->prepare(
    'SELECT id, fullname, email, phone, address, role, created_at FROM users WHERE id = ? LIMIT 1'
);
$stmt->execute([(int) $_SESSION['user_id']]);
$profile = $stmt->fetch();

if (!$profile) {
    clearUserSession();
    setFlash('warning', 'Please log in to continue.');
    redirect(appUrl('auth/login.php'));
}

$pageTitle = 'My Profile — ' . APP_NAME;
require __DIR__ . '/includes/header.php';
$user = currentUser();
$dashboardUrl = isAdmin() ? appUrl('admin/dashboard.php') : appUrl('parishioner/dashboard.php');
?>

<nav aria-label="breadcrumb" class="mb-3">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="<?= e($dashboardUrl) ?>">Dashboard</a></li>
        <li class="breadcrumb-item active">My Profile</li>
    </ol>
</nav>

<h1 class="h3 mb-4">My Profile</h1>

<div class="row g-4">
    <div class="col-lg-6">
        <div class="card card-panel">
            <div class="card-body">
                <h2 class="h5 mb-3">Account Information</h2>
                <p class="text-muted small mb-3">
                    Role: <span class="text-capitalize fw-medium"><?= e($profile['role']) ?></span>
                    <?php if (!empty($profile['created_at'])): ?>
                        · Member since <?= e(formatDate($profile['created_at'])) ?>
                    <?php endif; ?>
                </p>
                <form method="post" action="<?= e(appUrl('actions/profile.php')) ?>">
                    <?= csrfField() ?>
                    <input type="hidden" name="action" value="update_profile">
                    <div class="mb-3">
                        <label for="fullname" class="form-label">Full Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="fullname" name="fullname" required
                               value="<?= e($profile['fullname']) ?>">
                    </div>
                    <div class="mb-3">
                        <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
                        <input type="email" class="form-control" id="email" name="email" required
                               value="<?= e($profile['email']) ?>">
                    </div>
                    <div class="mb-3">
                        <label for="phone" class="form-label">Phone <span class="text-danger">*</span></label>
                        <input type="tel" class="form-control" id="phone" name="phone" required
                               value="<?= e($profile['phone']) ?>">
                    </div>
                    <div class="mb-3">
                        <label for="address" class="form-label">Address</label>
                        <textarea class="form-control" id="address" name="address" rows="2"><?= e($profile['address'] ?? '') ?></textarea>
                    </div>
                    <button type="submit" class="btn btn-parish-primary">Save Changes</button>
                </form>
            </div>
        </div>
    </div>
    <div class="col-lg-6">
        <div class="card card-panel">
            <div class="card-body">
                <h2 class="h5 mb-3">Change Password</h2>
                <form method="post" action="<?= e(appUrl('actions/profile.php')) ?>">
                    <?= csrfField() ?>
                    <input type="hidden" name="action" value="change_password">
                    <div class="mb-3">
                        <label for="current_password" class="form-label">Current Password <span class="text-danger">*</span></label>
                        <input type="password" class="form-control" id="current_password" name="current_password" required>
                    </div>
                    <div class="mb-3">
                        <label for="new_password" class="form-label">New Password <span class="text-danger">*</span></label>
                        <input type="password" class="form-control" id="new_password" name="new_password" required minlength="8">
                        <div class="form-text">At least 8 characters</div>
                    </div>
                    <div class="mb-3">
                        <label for="confirm_password" class="form-label">Confirm New Password <span class="text-danger">*</span></label>
                        <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
                    </div>
                    <button type="submit" class="btn btn-parish-primary">Update Password</button>
                </form>
            </div>
        </div>
    </div>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
