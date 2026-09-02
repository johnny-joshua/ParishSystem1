<?php
/**
 * Appointment module regression test (CLI)
 * Run: php server/tests/appointment_regression.php
 */

declare(strict_types=1);

$base = getenv('API_BASE') ?: 'http://localhost/parishSystem/server/api';
$cookieFile = sys_get_temp_dir() . '/parish_appointment_cookies.txt';

function resetSession(): void
{
    global $cookieFile;
    @unlink($cookieFile);
}

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

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $parts = explode("\r\n\r\n", (string) $raw, 2);
    $body = $parts[1] ?? '';
    $decoded = json_decode($body, true);

    return ['status' => $status, 'body' => $decoded, 'raw' => $body];
}

function assertTrue(bool $cond, string $label, array &$results): void
{
    $results[] = ['pass' => $cond, 'label' => $label];
    echo ($cond ? '[PASS] ' : '[FAIL] ') . $label . PHP_EOL;
}

$results = [];
$testEmail = 'appt_regression_' . time() . '@example.com';
$testPassword = 'TestPass123!';

echo "=== Appointment Module Regression ===\n";
echo "API base: $base\n\n";

resetSession();
$reg = request('POST', "$base/auth/register.php", [
    'fullname' => 'Appointment Tester',
    'email' => $testEmail,
    'phone' => '09170000002',
    'address' => 'Test Address',
    'password' => $testPassword,
    'confirm_password' => $testPassword,
]);
assertTrue($reg['status'] === 201 || $reg['status'] === 200, 'Register test user', $results);

resetSession();
$login = request('POST', "$base/auth/login.php", [
    'email' => $testEmail,
    'password' => $testPassword,
]);
assertTrue($login['status'] === 200, 'Login test user', $results);

// Official schedule: Tuesday and Sunday closed; Saturday open.
$nextMonday = new DateTimeImmutable('next monday');
$nextTuesday = $nextMonday->modify('+1 day')->format('Y-m-d');
$nextSaturday = $nextMonday->modify('+5 days')->format('Y-m-d');
$nextSunday = $nextMonday->modify('+6 days')->format('Y-m-d');
$closedTuesday = request('GET', "$base/appointments/availability.php?date=$nextTuesday");
$closedSunday = request('GET', "$base/appointments/availability.php?date=$nextSunday");
$openSaturday = request('GET', "$base/appointments/availability.php?date=$nextSaturday");
assertTrue($closedTuesday['status'] === 200 && empty($closedTuesday['body']['data']['available']), 'Tuesday is closed', $results);
assertTrue($closedSunday['status'] === 200 && empty($closedSunday['body']['data']['available']), 'Sunday is closed', $results);
assertTrue($openSaturday['status'] === 200 && !empty($openSaturday['body']['data']['available']), 'Saturday is open', $results);

// Past date blocked
$past = request('GET', "$base/appointments/availability.php?date=2020-01-06");
assertTrue($past['status'] === 200, 'Past date availability request', $results);
assertTrue(empty($past['body']['data']['available']), 'Past weekday has no available slots', $results);

// Find available weekday slot
$pickDate = null;
$pickTime = null;
$scanMonth = new DateTimeImmutable('first day of this month');
for ($m = 0; $m < 3 && $pickDate === null; $m++) {
    $month = $scanMonth->format('Y-m');
    $avail = request('GET', "$base/appointments/availability.php?month=$month");
    foreach ($avail['body']['data']['dates'] ?? [] as $date => $info) {
        if (($info['status'] ?? '') === 'available' && $date >= date('Y-m-d')) {
            $dayAvail = request('GET', "$base/appointments/availability.php?date=$date");
            foreach ($dayAvail['body']['data']['available'] ?? [] as $slot) {
                $pickDate = $date;
                $pickTime = $slot;
                break 2;
            }
        }
    }
    $scanMonth = $scanMonth->modify('+1 month');
}
assertTrue($pickDate !== null && $pickTime !== null, 'Find available weekday slot', $results);

$appointmentId = 0;
if ($pickDate) {
    $create = request('POST', "$base/appointments/index.php", [
        'appointment_date' => $pickDate,
        'appointment_time' => $pickTime,
        'purpose' => 'Regression test appointment',
    ]);
    assertTrue($create['status'] === 201, 'Create appointment', $results);
    $appointmentId = (int) ($create['body']['data']['id'] ?? 0);
    assertTrue($appointmentId > 0, 'Appointment ID returned', $results);

    // Double booking blocked
    $dup = request('POST', "$base/appointments/index.php", [
        'appointment_date' => $pickDate,
        'appointment_time' => $pickTime,
        'purpose' => 'Duplicate attempt',
    ]);
    assertTrue($dup['status'] === 409, 'Double booking rejected', $results);

    // Same user second appointment different slot
    $dayAvail2 = request('GET', "$base/appointments/availability.php?date=$pickDate");
    $secondSlot = null;
    foreach ($dayAvail2['body']['data']['available'] ?? [] as $slot) {
        if ($slot !== $pickTime) {
            $secondSlot = $slot;
            break;
        }
    }
    if ($secondSlot) {
        $second = request('POST', "$base/appointments/index.php", [
            'appointment_date' => $pickDate,
            'appointment_time' => $secondSlot,
            'purpose' => 'Second appointment same day',
        ]);
        assertTrue($second['status'] === 201, 'Same user multiple appointments allowed', $results);
    }

    // Lunch, before-hours, and after-hours times rejected
    foreach (['11:30:00', '07:30:00', '17:00:00'] as $invalidTime) {
        $invalidWindow = request('POST', "$base/appointments/index.php", [
            'appointment_date' => $pickDate,
            'appointment_time' => $invalidTime,
            'purpose' => 'Invalid schedule window',
        ]);
        assertTrue($invalidWindow['status'] === 422, "Invalid schedule time {$invalidTime} rejected", $results);
    }

    // Invalid time rejected
    $invalid = request('POST', "$base/appointments/index.php", [
        'appointment_date' => $pickDate,
        'appointment_time' => '03:00:00',
        'purpose' => 'Invalid time',
    ]);
    assertTrue($invalid['status'] === 422, 'Invalid time rejected', $results);

    // User notification on submit
    $notifs = request('GET', "$base/notifications/index.php");
    $hasSubmitNotif = false;
    foreach ($notifs['body']['data']['notifications'] ?? [] as $n) {
        if (($n['reference_type'] ?? '') === 'appointment' && stripos((string) ($n['title'] ?? ''), 'Submitted') !== false) {
            $hasSubmitNotif = true;
            break;
        }
    }
    assertTrue($hasSubmitNotif, 'User notification on appointment submit', $results);
}

// Admin workflow
resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);

if ($appointmentId > 0) {
    $adminList = request('GET', "$base/appointments/index.php?status=Pending");
    assertTrue($adminList['status'] === 200, 'Admin pending list', $results);

    $approve = request('PATCH', "$base/appointments/index.php", [
        'id' => $appointmentId,
        'status' => 'Approved',
    ]);
    assertTrue($approve['status'] === 200, 'Admin approve appointment', $results);

    resetSession();
    request('POST', "$base/auth/login.php", ['email' => $testEmail, 'password' => $testPassword]);
    $userNotifs = request('GET', "$base/notifications/index.php");
    $hasApproved = false;
    foreach ($userNotifs['body']['data']['notifications'] ?? [] as $n) {
        if (stripos((string) ($n['title'] ?? ''), 'Approved') !== false) {
            $hasApproved = true;
            break;
        }
    }
    assertTrue($hasApproved, 'User notification on approval', $results);

    resetSession();
    request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);

    $reject = request('PATCH', "$base/appointments/index.php", [
        'id' => $appointmentId,
        'status' => 'Rejected',
        'remarks' => 'Test rejection',
    ]);
    assertTrue($reject['status'] === 200, 'Admin reject appointment', $results);

    // Cancelled on a fresh appointment
    resetSession();
    request('POST', "$base/auth/login.php", ['email' => $testEmail, 'password' => $testPassword]);
    $dayAvail3 = request('GET', "$base/appointments/availability.php?date=$pickDate");
    $cancelSlot = $dayAvail3['body']['data']['available'][0] ?? null;
    if ($cancelSlot) {
        $cancelAppt = request('POST', "$base/appointments/index.php", [
            'appointment_date' => $pickDate,
            'appointment_time' => $cancelSlot,
            'purpose' => 'To be cancelled',
        ]);
        $cancelId = (int) ($cancelAppt['body']['data']['id'] ?? 0);
        if ($cancelId > 0) {
            resetSession();
            request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
            request('PATCH', "$base/appointments/index.php", ['id' => $cancelId, 'status' => 'Approved']);
            $cancel = request('PATCH', "$base/appointments/index.php", [
                'id' => $cancelId,
                'status' => 'Cancelled',
            ]);
            assertTrue($cancel['status'] === 200, 'Admin cancel appointment', $results);

            // Slot should be available again after cancel
            $afterCancel = request('GET', "$base/appointments/availability.php?date=$pickDate");
            $slotFree = in_array($cancelSlot, $afterCancel['body']['data']['available'] ?? [], true);
            assertTrue($slotFree, 'Cancelled slot becomes available', $results);
        }
    }

    // Remarks-only update should not duplicate notifications
    resetSession();
    request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
    $beforeCount = count(request('GET', "$base/notifications/index.php")['body']['data']['notifications'] ?? []);
    request('PATCH', "$base/appointments/index.php", [
        'id' => $appointmentId,
        'status' => 'Rejected',
        'remarks' => 'Updated remarks only',
    ]);
    resetSession();
    request('POST', "$base/auth/login.php", ['email' => $testEmail, 'password' => $testPassword]);
    $afterNotifs = request('GET', "$base/notifications/index.php")['body']['data']['notifications'] ?? [];
    $rejectNotifCount = 0;
    foreach ($afterNotifs as $n) {
        if (stripos((string) ($n['title'] ?? ''), 'Rejected') !== false) {
            $rejectNotifCount++;
        }
    }
    assertTrue($rejectNotifCount <= 1, 'Remarks-only update does not duplicate rejection notifications', $results);
}

// Dashboard counts
resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
$stats = request('GET', "$base/dashboard/stats.php");
assertTrue($stats['status'] === 200, 'Dashboard stats API', $results);
assertTrue(isset($stats['body']['data']['stats']['pending_appointments']), 'Dashboard pending_appointments count', $results);

// SMS logs exist for appointment flow
$sms = request('GET', "$base/sms/index.php");
assertTrue($sms['status'] === 200, 'SMS logs API', $results);

$passed = count(array_filter($results, fn($r) => $r['pass']));
$failed = count($results) - $passed;

echo "\n=== Summary: $passed passed, $failed failed ===\n";
exit($failed > 0 ? 1 : 0);
