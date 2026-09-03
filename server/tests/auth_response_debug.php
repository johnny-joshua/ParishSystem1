<?php
declare(strict_types=1);

$base = 'http://localhost/ParishSystem1/server/api';
$cookieFile = sys_get_temp_dir() . '/parish_auth_debug.txt';
@unlink($cookieFile);

function rawRequest(string $method, string $url, ?array $json = null): array
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
    $parts = explode("\r\n\r\n", $raw, 2);
    $headerBlock = $parts[0] ?? '';
    $body = $parts[1] ?? '';
    return [
        'status' => $status,
        'header_lines' => substr_count($headerBlock, "\n"),
        'has_set_cookie' => stripos($headerBlock, 'Set-Cookie:') !== false,
        'content_type' => preg_match('/Content-Type:\s*([^\r\n]+)/i', $headerBlock, $m) ? trim($m[1]) : null,
        'body_length' => strlen($body),
        'body_preview' => substr(preg_replace('/[\x00-\x1F\x7F]/', '?', $body), 0, 300),
        'json_ok' => json_decode($body, true) !== null,
    ];
}

$email = 'debug_' . time() . '@example.com';
$password = 'TestPass123!';

$register = rawRequest('POST', "$base/auth/register.php", [
    'fullname' => 'Debug User',
    'email' => $email,
    'phone' => '09170000003',
    'password' => $password,
    'confirm_password' => $password,
]);

$login = rawRequest('POST', "$base/auth/login.php", [
    'email' => $email,
    'password' => $password,
]);

$me = rawRequest('GET', "$base/auth/me.php");

echo json_encode(compact('register', 'login', 'me'), JSON_PRETTY_PRINT) . PHP_EOL;
