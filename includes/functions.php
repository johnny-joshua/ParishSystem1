<?php

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function redirect(string $path): void
{
    header('Location: ' . $path);
    exit;
}

function baseUrl(string $path = ''): string
{
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    if (str_ends_with($base, '/auth') || str_ends_with($base, '/parishioner') || str_ends_with($base, '/admin') || str_ends_with($base, '/actions')) {
        $base = dirname($base);
    }
    if ($base === '/' || $base === '\\') {
        $base = '';
    }
    $path = ltrim($path, '/');
    return $base . ($path !== '' ? '/' . $path : '');
}

function appUrl(string $path = ''): string
{
    static $root = null;
    if ($root === null) {
        $root = dirname(__DIR__);
        $docRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
        $appRoot = realpath($root);
        if ($docRoot && $appRoot && str_starts_with($appRoot, $docRoot)) {
            $root = str_replace('\\', '/', substr($appRoot, strlen($docRoot)));
        } else {
            $root = '/ParishSystem1';
        }
        $root = rtrim($root, '/');
    }
    $path = ltrim($path, '/');
    return $root . ($path !== '' ? '/' . $path : '');
}

function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrfField(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrfToken()) . '">';
}

function verifyCsrf(): bool
{
    $token = $_POST['csrf_token'] ?? '';
    return $token !== '' && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

function setFlash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function getFlash(): ?array
{
    if (empty($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

function statusBadgeClass(string $status): string
{
    return match ($status) {
        'Pending', 'Under Review' => 'warning',
        'Approved' => 'success',
        'Rejected' => 'danger',
        'Completed' => 'info',
        default => 'secondary',
    };
}

function serviceTypes(): array
{
    return ['Marriage', 'Funeral', 'Baptism', 'Mass Intention', 'Private Mass'];
}

function reservationStatuses(): array
{
    return ['Pending', 'Under Review', 'Approved', 'Rejected', 'Completed', 'Cancelled'];
}

function validateEmail(string $email): bool
{
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function formatDate(?string $date): string
{
    if (!$date) {
        return '—';
    }
    $ts = strtotime($date);
    return $ts ? date('M j, Y', $ts) : e($date);
}

function formatTime(?string $time): string
{
    if (!$time) {
        return '—';
    }
    $ts = strtotime($time);
    return $ts ? date('g:i A', $ts) : e($time);
}
