<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

guestOnly();

$pageTitle = 'Register — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';
?>

<div class="auth-card card">
    <div class="card-body p-4">
        <h2 class="h4 text-center mb-1">Create Account</h2>
        <p class="text-center text-muted small mb-4">Register as a parishioner</p>
        <form method="post" action="<?= e(appUrl('actions/register.php')) ?>">
            <?= csrfField() ?>
            <div class="mb-3">
                <label for="fullname" class="form-label">Full Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="fullname" name="fullname" required
                       value="<?= e($_POST['fullname'] ?? '') ?>">
            </div>
            <div class="mb-3">
                <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
                <input type="email" class="form-control" id="email" name="email" required
                       value="<?= e($_POST['email'] ?? '') ?>">
            </div>
            <div class="mb-3">
                <label for="phone" class="form-label">Phone <span class="text-danger">*</span></label>
                <input type="tel" class="form-control" id="phone" name="phone" required
                       value="<?= e($_POST['phone'] ?? '') ?>">
            </div>
            <div class="mb-3">
                <label for="address" class="form-label">Address</label>
                <textarea class="form-control" id="address" name="address" rows="2"><?= e($_POST['address'] ?? '') ?></textarea>
            </div>
            <div class="mb-3">
                <label for="password" class="form-label">Password <span class="text-danger">*</span></label>
                <input type="password" class="form-control" id="password" name="password" required minlength="8">
                <div class="form-text">At least 8 characters</div>
            </div>
            <div class="mb-3">
                <label for="confirm_password" class="form-label">Confirm Password <span class="text-danger">*</span></label>
                <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
            </div>
            <button type="submit" class="btn btn-parish-primary w-100">Register</button>
        </form>
        <p class="text-center mt-3 mb-0 small">
            Already registered? <a href="<?= e(appUrl('auth/login.php')) ?>">Sign in</a>
        </p>
    </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
