<?php
declare(strict_types=1);

$cookieFile = sys_get_temp_dir() . '/parish_cookie_path.txt';
@unlink($cookieFile);

$ch = curl_init('http://localhost/ParishSystem1/server/api/auth/login.php');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']),
    CURLOPT_COOKIEJAR => $cookieFile,
]);
$raw = (string) curl_exec($ch);
curl_close($ch);

$headers = explode("\r\n", explode("\r\n\r\n", $raw, 2)[0] ?? '');
$setCookie = null;
foreach ($headers as $line) {
    if (stripos($line, 'Set-Cookie:') === 0) {
        $setCookie = trim(substr($line, strlen('Set-Cookie:')));
        break;
    }
}

if ($setCookie === null) {
    echo json_encode(['error' => 'no_set_cookie']) . PHP_EOL;
    exit(1);
}

$attrs = [];
foreach (explode(';', $setCookie) as $part) {
    $part = trim($part);
    if (str_contains($part, '=')) {
        [$k, $v] = explode('=', $part, 2);
        $attrs[strtolower($k)] = $v;
    } else {
        $attrs[strtolower($part)] = true;
    }
}

echo json_encode([
    'cookie_name' => explode('=', $setCookie, 2)[0],
    'path' => $attrs['path'] ?? null,
    'domain' => $attrs['domain'] ?? null,
    'samesite' => $attrs['samesite'] ?? null,
    'httponly' => isset($attrs['httponly']),
], JSON_PRETTY_PRINT) . PHP_EOL;
