<?php
/**
 * Minimal auth session diagnostic (no sensitive output)
 * Run: php server/tests/auth_session_test.php
 */

declare(strict_types=1);

$base = getenv('API_BASE') ?: 'http://localhost/ParishSystem1/server/api';
$cookieFile = sys_get_temp_dir() . '/parish_auth_session_test.txt';
@unlink($cookieFile);

function request(string $method, string $url, ?array $json = null): array
{
    global $cookieFile;

    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_COOKIEJAR => $cookieFile,
        CURLOPT_COOKIEFILE => $cookieFile,
        CURLOPT_HEADER => true,
    ]);

    if ($json !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json));
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $raw = (string) curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $hasSetCookie = preg_match('/Set-Cookie:/i', $raw) === 1;
    $parts = explode("\r\n\r\n", $raw, 2);
    $body = $parts[1] ?? '';
    $decoded = json_decode($body, true);

    return [
        'status' => $status,
        'body' => $decoded,
        'has_set_cookie' => $hasSetCookie,
        'cookie_saved' => is_file($cookieFile) && filesize($cookieFile) > 0,
    ];
}

$email = 'session_test_' . time() . '@example.com';
$password = 'TestPass123!';

$register = request('POST', "$base/auth/register.php", [
    'fullname' => 'Session Test',
    'email' => $email,
    'phone' => '09170000002',
    'password' => $password,
    'confirm_password' => $password,
]);

$login = request('POST', "$base/auth/login.php", [
    'email' => $email,
    'password' => $password,
]);

$me = request('GET', "$base/auth/me.php");

$report = [
    'register_status' => $register['status'],
    'register_success' => $register['body']['success'] ?? null,
    'login_status' => $login['status'],
    'login_success' => $login['body']['success'] ?? null,
    'login_set_cookie' => $login['has_set_cookie'],
    'cookie_file_saved' => $login['cookie_saved'],
    'me_status' => $me['status'],
    'me_success' => $me['body']['success'] ?? null,
    'session_works' => ($me['status'] === 200 && ($me['body']['success'] ?? false) === true),
];

echo json_encode($report, JSON_PRETTY_PRINT) . PHP_EOL;

exit($report['session_works'] ? 0 : 1);
