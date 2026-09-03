<?php
/**
 * Race-condition test for appointment double-booking (CLI, Windows-compatible)
 * Run: php server/tests/appointment_race_test.php
 */

declare(strict_types=1);

$base = getenv('API_BASE') ?: 'http://localhost/ParishSystem1/server/api';

function parallelPost(string $url, string $cookieFile, string $payload): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_COOKIEJAR => $cookieFile,
        CURLOPT_COOKIEFILE => $cookieFile,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
    ]);

    return ['ch' => $ch, 'cookie' => $cookieFile];
}

function execHandle($handle): array
{
    $body = curl_exec($handle['ch']);
    $status = (int) curl_getinfo($handle['ch'], CURLINFO_HTTP_CODE);
    curl_close($handle['ch']);
    return ['status' => $status, 'body' => json_decode((string) $body, true)];
}

function requestWithCookie(string $method, string $url, string $cookieFile, ?array $json = null): array
{
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_COOKIEJAR => $cookieFile,
        CURLOPT_COOKIEFILE => $cookieFile,
    ]);
    if ($json !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json));
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'body' => json_decode((string) $body, true)];
}

function registerAndLogin(string $suffix, string $cookieFile): bool
{
    global $base;
    @unlink($cookieFile);
    $email = "race_{$suffix}_" . time() . '@example.com';
    $password = 'TestPass123!';

    $reg = requestWithCookie('POST', "$base/auth/register.php", $cookieFile, [
        'fullname' => "Race User $suffix",
        'email' => $email,
        'phone' => '0917000' . str_pad((string) ((int) $suffix + (time() % 1000)), 4, '0', STR_PAD_LEFT),
        'address' => 'Test',
        'password' => $password,
        'confirm_password' => $password,
    ]);
    if (!in_array($reg['status'], [200, 201], true)) {
        echo "[FAIL] Register user $suffix (HTTP {$reg['status']})\n";
        return false;
    }

    @unlink($cookieFile);
    $login = requestWithCookie('POST', "$base/auth/login.php", $cookieFile, [
        'email' => $email,
        'password' => $password,
    ]);
    if ($login['status'] !== 200) {
        echo "[FAIL] Login user $suffix (HTTP {$login['status']})\n";
        return false;
    }

    return true;
}

function findAvailableSlot(string $cookieFile): ?array
{
    global $base;
    $scanMonth = new DateTimeImmutable('first day of this month');
    for ($m = 0; $m < 6; $m++) {
        $month = $scanMonth->format('Y-m');
        $avail = requestWithCookie('GET', "$base/appointments/availability.php?month=$month", $cookieFile);
        foreach ($avail['body']['data']['dates'] ?? [] as $date => $info) {
            if (($info['status'] ?? '') === 'available' && $date >= date('Y-m-d')) {
                $dayAvail = requestWithCookie('GET', "$base/appointments/availability.php?date=$date", $cookieFile);
                $slot = $dayAvail['body']['data']['available'][0] ?? null;
                if ($slot) {
                    return ['date' => $date, 'time' => $slot];
                }
            }
        }
        $scanMonth = $scanMonth->modify('+1 month');
    }
    return null;
}

echo "=== Appointment Race Condition Test ===\n";
echo "API base: $base\n\n";

$cookieA = sys_get_temp_dir() . '/parish_race_user_a.txt';
$cookieB = sys_get_temp_dir() . '/parish_race_user_b.txt';

if (!registerAndLogin('a', $cookieA) || !registerAndLogin('b', $cookieB)) {
    exit(1);
}

$slot = findAvailableSlot($cookieA);
if (!$slot) {
    echo "[FAIL] No available slot found\n";
    exit(1);
}

echo "Using slot {$slot['date']} {$slot['time']}\n";

$payload = json_encode([
    'appointment_date' => $slot['date'],
    'appointment_time' => $slot['time'],
    'purpose' => 'Race test booking',
]);

$url = "$base/appointments/index.php";
$mh = curl_multi_init();
$ha = parallelPost($url, $cookieA, $payload);
$hb = parallelPost($url, $cookieB, $payload);
curl_multi_add_handle($mh, $ha['ch']);
curl_multi_add_handle($mh, $hb['ch']);

do {
    $status = curl_multi_exec($mh, $running);
    if ($running) {
        curl_multi_select($mh, 1.0);
    }
} while ($running && $status === CURLM_OK);

$results = [];
foreach ([$ha, $hb] as $handle) {
    $body = curl_multi_getcontent($handle['ch']);
    $code = (int) curl_getinfo($handle['ch'], CURLINFO_HTTP_CODE);
    curl_multi_remove_handle($mh, $handle['ch']);
    curl_close($handle['ch']);
    $results[] = ['status' => $code, 'body' => json_decode((string) $body, true)];
}
curl_multi_close($mh);

$successes = array_filter($results, fn($r) => $r['status'] === 201);
$conflicts = array_filter($results, fn($r) => $r['status'] === 409);

$passRace = count($successes) === 1 && count($conflicts) === 1;
echo ($passRace ? '[PASS] ' : '[FAIL] ') . 'Simultaneous booking: 1x201, 1x409 (got '
    . count($successes) . ' success, ' . count($conflicts) . " conflict)\n";

foreach ($results as $i => $result) {
    echo "  Client " . ($i + 1) . ": HTTP {$result['status']}\n";
}

foreach ($conflicts as $conflict) {
    $msg = $conflict['body']['message'] ?? '';
    $okFormat = ($conflict['body']['success'] ?? null) === false
        && $msg === 'This date and time slot is already booked.';
    echo ($okFormat ? '[PASS] ' : '[FAIL] ') . "409 JSON format matches API\n";
}

// Cancelled slot should be bookable again
$adminCookie = sys_get_temp_dir() . '/parish_race_admin.txt';
@unlink($adminCookie);
requestWithCookie('POST', "$base/auth/login.php", $adminCookie, [
    'email' => 'admin@holyfamilyparish.com',
    'password' => 'admin123',
]);

$list = requestWithCookie('GET', "$base/appointments/index.php?status=Pending", $adminCookie);
$bookedId = null;
foreach ($list['body']['data']['appointments'] ?? [] as $row) {
    if (($row['appointment_date'] ?? '') === $slot['date']
        && normalizeTime((string) ($row['appointment_time'] ?? '')) === normalizeTime($slot['time'])) {
        $bookedId = (int) ($row['id'] ?? 0);
        break;
    }
}

function normalizeTime(string $time): string
{
    if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?/', trim($time), $m)) {
        return sprintf('%02d:%02d:%02d', (int) $m[1], (int) $m[2], isset($m[3]) ? (int) $m[3] : 0);
    }
    return $time;
}

$passCancel = false;
if ($bookedId) {
    requestWithCookie('PATCH', "$base/appointments/index.php", $adminCookie, [
        'id' => $bookedId,
        'status' => 'Cancelled',
    ]);
    $cookieC = sys_get_temp_dir() . '/parish_race_user_c.txt';
    if (registerAndLogin('c', $cookieC)) {
        $rebook = requestWithCookie('POST', "$base/appointments/index.php", $cookieC, [
            'appointment_date' => $slot['date'],
            'appointment_time' => $slot['time'],
            'purpose' => 'Rebook after cancel',
        ]);
        $passCancel = $rebook['status'] === 201;
    }
} else {
    echo "[WARN] Could not find booked appointment to cancel\n";
}

echo ($passCancel ? '[PASS] ' : '[FAIL] ') . "Cancelled slot can be rebooked\n";

$failed = (!$passRace || !$passCancel) ? 1 : 0;
echo "\n=== Summary: " . ($failed ? 'FAILED' : 'PASSED') . " ===\n";
exit($failed);
