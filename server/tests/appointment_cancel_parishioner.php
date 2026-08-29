<?php
/**
 * BUG-03: Parishioner appointment cancellation regression
 * Run: php server/tests/appointment_cancel_parishioner.php
 */
declare(strict_types=1);

$base = getenv('API_BASE') ?: 'http://localhost/parishSystem/server/api';
$cookieA = sys_get_temp_dir() . '/parish_cancel_user_a.txt';
$cookieB = sys_get_temp_dir() . '/parish_cancel_user_b.txt';
$cookieAdmin = sys_get_temp_dir() . '/parish_cancel_admin.txt';
@unlink($cookieA);
@unlink($cookieB);
@unlink($cookieAdmin);

function request(string $method, string $url, string $cookieFile, ?array $json = null): array
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
    return ['status' => $status, 'body' => json_decode((string) $body, true), 'raw' => $body];
}

function assertTrue(bool $ok, string $label, array &$results): void
{
    $results[] = ['pass' => $ok, 'label' => $label];
    echo ($ok ? '[PASS] ' : '[FAIL] ') . $label . PHP_EOL;
}

function findSlot(string $base, string $cookie): ?array
{
    $scan = new DateTimeImmutable('first day of this month');
    for ($m = 0; $m < 6; $m++) {
        $month = $scan->format('Y-m');
        $avail = request('GET', "$base/appointments/availability.php?month=$month", $cookie);
        foreach ($avail['body']['data']['dates'] ?? [] as $date => $info) {
            if (($info['status'] ?? '') === 'available' && $date >= date('Y-m-d')) {
                $day = request('GET', "$base/appointments/availability.php?date=$date", $cookie);
                $slot = $day['body']['data']['available'][0] ?? null;
                if ($slot) {
                    return ['date' => $date, 'time' => $slot];
                }
            }
        }
        $scan = $scan->modify('+1 month');
    }
    return null;
}

$results = [];
$pw = 'TestPass123!';
$ts = time();

echo "=== Parishioner Appointment Cancellation (BUG-03) ===\n";

$regA = request('POST', "$base/auth/register.php", $cookieA, [
    'fullname' => 'Cancel User A',
    'email' => "cancel_a_{$ts}@test.com",
    'phone' => '09171110001',
    'address' => 'Test',
    'password' => $pw,
    'confirm_password' => $pw,
]);
assertTrue($regA['status'] === 201 || $regA['status'] === 200, 'Register user A', $results);

$regB = request('POST', "$base/auth/register.php", $cookieB, [
    'fullname' => 'Cancel User B',
    'email' => "cancel_b_{$ts}@test.com",
    'phone' => '09171110002',
    'address' => 'Test',
    'password' => $pw,
    'confirm_password' => $pw,
]);
assertTrue($regB['status'] === 201 || $regB['status'] === 200, 'Register user B', $results);

$slot1 = findSlot($base, $cookieA);
assertTrue($slot1 !== null, 'Find available slot 1', $results);

$createPending = request('POST', "$base/appointments/index.php", $cookieA, [
    'appointment_date' => $slot1['date'],
    'appointment_time' => $slot1['time'],
    'purpose' => 'Pending cancel test',
]);
$pendingId = (int) ($createPending['body']['data']['id'] ?? 0);
assertTrue($createPending['status'] === 201 && $pendingId > 0, "Create Pending appointment #$pendingId", $results);

// Pending → Cancelled by owner
$cancelPending = request('PATCH', "$base/appointments/index.php", $cookieA, [
    'id' => $pendingId,
    'status' => 'Cancelled',
]);
assertTrue(
    $cancelPending['status'] === 200 && ($cancelPending['body']['data']['status'] ?? '') === 'Cancelled',
    'Pending → Cancelled by parishioner',
    $results
);

// Slot free again
$afterPendingCancel = request('GET', "$base/appointments/availability.php?date={$slot1['date']}", $cookieA);
$slotFree = in_array($slot1['time'], $afterPendingCancel['body']['data']['available'] ?? [], true);
assertTrue($slotFree, 'Slot available again after Pending cancel', $results);

// Approved → Cancelled
$slot2 = findSlot($base, $cookieA);
assertTrue($slot2 !== null, 'Find available slot 2', $results);
$createApproved = request('POST', "$base/appointments/index.php", $cookieA, [
    'appointment_date' => $slot2['date'],
    'appointment_time' => $slot2['time'],
    'purpose' => 'Approved cancel test',
]);
$approvedId = (int) ($createApproved['body']['data']['id'] ?? 0);
assertTrue($approvedId > 0, "Create appointment for approve #$approvedId", $results);

request('POST', "$base/auth/login.php", $cookieAdmin, [
    'email' => 'admin@holyfamilyparish.com',
    'password' => 'admin123',
]);
$approve = request('PATCH', "$base/appointments/index.php", $cookieAdmin, [
    'id' => $approvedId,
    'status' => 'Approved',
]);
assertTrue($approve['status'] === 200, 'Admin approve appointment', $results);

$cancelApproved = request('PATCH', "$base/appointments/index.php", $cookieA, [
    'id' => $approvedId,
    'status' => 'Cancelled',
]);
assertTrue(
    $cancelApproved['status'] === 200 && ($cancelApproved['body']['data']['status'] ?? '') === 'Cancelled',
    'Approved → Cancelled by parishioner',
    $results
);

$afterApprovedCancel = request('GET', "$base/appointments/availability.php?date={$slot2['date']}", $cookieA);
assertTrue(
    in_array($slot2['time'], $afterApprovedCancel['body']['data']['available'] ?? [], true),
    'Slot available again after Approved cancel',
    $results
);

// Completed → blocked
$slot3 = findSlot($base, $cookieA);
$createDone = request('POST', "$base/appointments/index.php", $cookieA, [
    'appointment_date' => $slot3['date'],
    'appointment_time' => $slot3['time'],
    'purpose' => 'Completed block test',
]);
$doneId = (int) ($createDone['body']['data']['id'] ?? 0);
request('PATCH', "$base/appointments/index.php", $cookieAdmin, ['id' => $doneId, 'status' => 'Approved']);
request('PATCH', "$base/appointments/index.php", $cookieAdmin, ['id' => $doneId, 'status' => 'Completed']);
$cancelDone = request('PATCH', "$base/appointments/index.php", $cookieA, [
    'id' => $doneId,
    'status' => 'Cancelled',
]);
assertTrue($cancelDone['status'] === 422, 'Completed → cancel blocked (422)', $results);

// Rejected → blocked
$slot4 = findSlot($base, $cookieA);
$createReject = request('POST', "$base/appointments/index.php", $cookieA, [
    'appointment_date' => $slot4['date'],
    'appointment_time' => $slot4['time'],
    'purpose' => 'Rejected block test',
]);
$rejectId = (int) ($createReject['body']['data']['id'] ?? 0);
request('PATCH', "$base/appointments/index.php", $cookieAdmin, [
    'id' => $rejectId,
    'status' => 'Rejected',
    'remarks' => 'Not available',
]);
$cancelReject = request('PATCH', "$base/appointments/index.php", $cookieA, [
    'id' => $rejectId,
    'status' => 'Cancelled',
]);
assertTrue($cancelReject['status'] === 422, 'Rejected → cancel blocked (422)', $results);

// Another user's appointment → 403
$slot5 = findSlot($base, $cookieA);
$createOwn = request('POST', "$base/appointments/index.php", $cookieA, [
    'appointment_date' => $slot5['date'],
    'appointment_time' => $slot5['time'],
    'purpose' => 'Ownership test',
]);
$ownId = (int) ($createOwn['body']['data']['id'] ?? 0);
$otherCancel = request('PATCH', "$base/appointments/index.php", $cookieB, [
    'id' => $ownId,
    'status' => 'Cancelled',
]);
assertTrue($otherCancel['status'] === 403, "Another user's appointment → 403", $results);

// Parishioner cannot approve
$parishApprove = request('PATCH', "$base/appointments/index.php", $cookieA, [
    'id' => $ownId,
    'status' => 'Approved',
]);
assertTrue($parishApprove['status'] === 403, 'Parishioner cannot approve (403)', $results);

// Admin workflow still works
$adminCancel = request('PATCH', "$base/appointments/index.php", $cookieAdmin, [
    'id' => $ownId,
    'status' => 'Cancelled',
]);
assertTrue($adminCancel['status'] === 200, 'Admin cancel workflow preserved', $results);

// cancelled_at + notification check via DB if available
require_once __DIR__ . '/../config/database.php';
$db = getDB();
$row = $db->prepare('SELECT status, cancelled_at FROM appointments WHERE id = ?');
$row->execute([$pendingId]);
$pendingRow = $row->fetch(PDO::FETCH_ASSOC);
assertTrue(
    ($pendingRow['status'] ?? '') === 'Cancelled' && !empty($pendingRow['cancelled_at']),
    'cancelled_at saved on parishioner cancel',
    $results
);

$notif = $db->prepare(
    "SELECT COUNT(*) FROM notifications WHERE reference_type = 'appointment' AND reference_id = ? AND title LIKE '%Cancelled%'"
);
$notif->execute([$pendingId]);
assertTrue((int) $notif->fetchColumn() >= 1, 'Cancellation notification created (no missing helper)', $results);

$failed = count(array_filter($results, fn($r) => !$r['pass']));
echo "\n" . ($failed === 0 ? "ALL PASSED" : "$failed FAILED") . " (" . count($results) . " checks)\n";
exit($failed === 0 ? 0 : 1);
