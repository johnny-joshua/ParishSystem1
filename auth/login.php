<?php

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

guestOnly();

$pageTitle = 'Login — ' . APP_NAME;
require __DIR__ . '/../includes/header.php';
?>

<div class="auth-card card">
    <div class="card-body p-4">
        <h2 class="h4 text-center mb-1">Parishioner Login</h2>
        <p class="text-center text-muted small mb-4">Access reservations and appointments</p>
        <form method="post" action="<?= e(appUrl('actions/login.php')) ?>">
            <?= csrfField() ?>
            <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input type="email" class="form-control" id="email" name="email" required
                       value="<?= e($_POST['email'] ?? '') ?>" autocomplete="email">
            </div>
            <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" name="password" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-parish-primary w-100">Sign In</button>
        </form>
        <p class="text-center mt-3 mb-0 small">
            No account? <a href="<?= e(appUrl('auth/register.php')) ?>">Register here</a>
        </p>
    </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>
