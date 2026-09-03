<?php
/**
 * Registration validation regression test (CLI)
 * Run: php server/tests/registration_validation.php
 */

declare(strict_types=1);

$base = getenv('API_BASE') ?: 'http://localhost/ParishSystem1/server/api';
$cookieFile = sys_get_temp_dir() . '/parish_registration_validation_cookies.txt';
@unlink($cookieFile);

function requestRegistration(array $payload): array
{
    global $base, $cookieFile;
    $ch = curl_init($base . '/auth/register.php');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_COOKIEJAR => $cookieFile,
        CURLOPT_HEADER => false,
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'body' => json_decode((string) $body, true) ?: []];
}

function assertTest(bool $condition, string $label): void
{
    echo ($condition ? '[PASS] ' : '[FAIL] ') . $label . PHP_EOL;
    if (!$condition) exit(1);
}

$existing = requestRegistration([
    'fullname' => ' JOHN   JOSHUA ROJO ',
    'email' => 'registration_probe_name@gmail.com',
    'phone' => '09170000002',
    'password' => 'TestPass123!',
    'confirm_password' => 'TestPass123!',
]);
assertTest($existing['status'] === 409 && ($existing['body']['errors']['fullname'] ?? '') === 'Name is already used.', 'Duplicate name rejected with field error');

$phone = requestRegistration([
    'fullname' => 'Registration Probe Phone',
    'email' => 'registration_probe_phone@gmail.com',
    'phone' => '+639773736816',
    'password' => 'TestPass123!',
    'confirm_password' => 'TestPass123!',
]);
assertTest($phone['status'] === 409 && ($phone['body']['errors']['phone'] ?? '') === 'Phone number is already used.', 'Duplicate phone rejected with field error');

$both = requestRegistration([
    'fullname' => 'john joshua rojo',
    'email' => 'registration_probe_both@gmail.com',
    'phone' => '09773736816',
    'password' => 'TestPass123!',
    'confirm_password' => 'TestPass123!',
]);
assertTest($both['status'] === 409
    && ($both['body']['errors']['fullname'] ?? '') === 'Name is already used.'
    && ($both['body']['errors']['phone'] ?? '') === 'Phone number is already used.', 'Duplicate name and phone both reported');

$gmail = requestRegistration([
    'fullname' => 'Registration Probe Gmail',
    'email' => 'registration_probe_yahoo@yahoo.com',
    'phone' => '09170000004',
    'password' => 'TestPass123!',
    'confirm_password' => 'TestPass123!',
]);
assertTest($gmail['status'] === 422 && ($gmail['body']['errors']['email'] ?? '') === 'Please use a valid Gmail address ending in @gmail.com.', 'Non-Gmail address rejected');

echo "Registration validation checks passed." . PHP_EOL;
