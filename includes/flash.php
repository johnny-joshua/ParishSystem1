<?php
$flash = getFlash();
if ($flash):
    $alertClass = match ($flash['type']) {
        'success' => 'success',
        'danger', 'error' => 'danger',
        'warning' => 'warning',
        default => 'info',
    };
?>
<div class="alert alert-<?= e($alertClass) ?> alert-dismissible fade show" role="alert">
    <?= e($flash['message']) ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>
<?php endif; ?>
