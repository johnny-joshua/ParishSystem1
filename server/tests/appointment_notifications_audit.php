<?php
/**
 * Appointment notifications + SMS audit (CLI)
 * Run: php server/tests/appointment_notifications_audit.php
 */

declare(strict_types=1);

$base = getenv('API_BASE') ?: 'http://localhost/ParishSystem1/server/api';
$cookieFile = sys_get_temp_dir() . '/parish_appt_notif_audit.txt';

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
    $decoded = json_decode($parts[1] ?? '', true);

    return ['status' => $status, 'body' => $decoded];
}

function assertTrue(bool $cond, string $label, array &$results): void
{
    $results[] = ['pass' => $cond, 'label' => $label];
    echo ($cond ? '[PASS] ' : '[FAIL] ') . $label . PHP_EOL;
}

function countNotifs(array $notifs, string $titleContains, ?int $refId = null): int
{
    $count = 0;
    foreach ($notifs as $n) {
        if (($n['reference_type'] ?? '') !== 'appointment') {
            continue;
        }
        if ($refId !== null && (int) ($n['reference_id'] ?? 0) !== $refId) {
            continue;
        }
        if (stripos((string) ($n['title'] ?? ''), $titleContains) !== false) {
            $count++;
        }
    }
    return $count;
}

function countSmsForUser(array $logs, int $userId, string $messageContains): int
{
    $count = 0;
    foreach ($logs as $log) {
        if ((int) ($log['user_id'] ?? 0) !== $userId) {
            continue;
        }
        if (stripos((string) ($log['message'] ?? ''), $messageContains) !== false) {
            $count++;
        }
    }
    return $count;
}

function findSlot(): array
{
    global $base;
    $scanMonth = new DateTimeImmutable('first day of this month');
    for ($m = 0; $m < 3; $m++) {
        $month = $scanMonth->format('Y-m');
        $avail = request('GET', "$base/appointments/availability.php?month=$month");
        foreach ($avail['body']['data']['dates'] ?? [] as $date => $info) {
            if (($info['status'] ?? '') === 'available' && $date >= date('Y-m-d')) {
                $dayAvail = request('GET', "$base/appointments/availability.php?date=$date");
                foreach ($dayAvail['body']['data']['available'] ?? [] as $slot) {
                    return [$date, $slot];
                }
            }
        }
        $scanMonth = $scanMonth->modify('+1 month');
    }
    return [null, null];
}

$results = [];
$email = 'appt_notif_audit_' . time() . '@example.com';
$password = 'TestPass123!';

echo "=== Appointment Notifications + SMS Audit ===\n\n";

resetSession();
request('POST', "$base/auth/register.php", [
    'fullname' => 'Notif Audit User',
    'email' => $email,
    'phone' => '09170000099',
    'address' => 'Audit Address',
    'password' => $password,
    'confirm_password' => $password,
]);
resetSession();
$login = request('POST', "$base/auth/login.php", ['email' => $email, 'password' => $password]);
assertTrue($login['status'] === 200, 'Login parishioner', $results);
$userId = (int) ($login['body']['data']['user']['id'] ?? 0);

[$pickDate, $pickTime] = findSlot();
assertTrue($pickDate !== null, 'Find available slot', $results);

$pendingBefore = 0;
resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
$statsBefore = request('GET', "$base/dashboard/stats.php");
$pendingBefore = (int) ($statsBefore['body']['data']['stats']['pending_appointments'] ?? 0);

resetSession();
request('POST', "$base/auth/login.php", ['email' => $email, 'password' => $password]);
$create = request('POST', "$base/appointments/index.php", [
    'appointment_date' => $pickDate,
    'appointment_time' => $pickTime,
    'purpose' => 'Notification audit appointment',
]);
$appointmentId = (int) ($create['body']['data']['id'] ?? 0);
assertTrue($create['status'] === 201 && $appointmentId > 0, 'Appointment created', $results);

$userNotifs = request('GET', "$base/notifications/index.php")['body']['data']['notifications'] ?? [];
assertTrue(
    countNotifs($userNotifs, 'Submitted', $appointmentId) >= 1,
    'Appointment Created — parishioner notification sent',
    $results
);

resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
$adminNotifs = request('GET', "$base/notifications/index.php")['body']['data']['notifications'] ?? [];
$adminNewReq = false;
foreach ($adminNotifs as $n) {
    if (($n['reference_type'] ?? '') === 'appointment'
        && (int) ($n['reference_id'] ?? 0) === $appointmentId
        && stripos((string) ($n['title'] ?? ''), 'New appointment') !== false) {
        $adminNewReq = true;
        break;
    }
}
assertTrue($adminNewReq, 'Appointment Created — admin notification sent', $results);

$smsLogs = request('GET', "$base/sms/index.php")['body']['data']['logs'] ?? [];
assertTrue(
    countSmsForUser($smsLogs, $userId, 'received and is pending approval') >= 1,
    'Appointment Created — SMS logged',
    $results
);

$statsAfterCreate = request('GET', "$base/dashboard/stats.php");
$pendingAfterCreate = (int) ($statsAfterCreate['body']['data']['stats']['pending_appointments'] ?? 0);
assertTrue($pendingAfterCreate === $pendingBefore + 1, 'Dashboard pending count increased after create', $results);

$reportsBefore = request('GET', "$base/reports/summary.php");
$pendingReportBefore = (int) ($reportsBefore['body']['data']['pending_appointments'] ?? 0);

request('PATCH', "$base/appointments/index.php", ['id' => $appointmentId, 'status' => 'Approved']);
resetSession();
request('POST', "$base/auth/login.php", ['email' => $email, 'password' => $password]);
$userNotifs = request('GET', "$base/notifications/index.php")['body']['data']['notifications'] ?? [];
assertTrue(
    countNotifs($userNotifs, 'Approved', $appointmentId) >= 1,
    'Appointment Approved — parishioner notification sent',
    $results
);

resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
$smsLogs = request('GET', "$base/sms/index.php")['body']['data']['logs'] ?? [];
assertTrue(
    countSmsForUser($smsLogs, $userId, 'has been approved') >= 1,
    'Appointment Approved — SMS logged',
    $results
);

request('PATCH', "$base/appointments/index.php", ['id' => $appointmentId, 'status' => 'Rejected', 'remarks' => 'Audit reject']);
resetSession();
request('POST', "$base/auth/login.php", ['email' => $email, 'password' => $password]);
$userNotifs = request('GET', "$base/notifications/index.php")['body']['data']['notifications'] ?? [];
assertTrue(
    countNotifs($userNotifs, 'Rejected', $appointmentId) >= 1,
    'Appointment Rejected — parishioner notification sent',
    $results
);

resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
$smsLogs = request('GET', "$base/sms/index.php")['body']['data']['logs'] ?? [];
assertTrue(
    countSmsForUser($smsLogs, $userId, 'has been rejected') >= 1,
    'Appointment Rejected — SMS logged',
    $results
);

// Cancel flow on fresh appointment
resetSession();
request('POST', "$base/auth/login.php", ['email' => $email, 'password' => $password]);
$dayAvail = request('GET', "$base/appointments/availability.php?date=$pickDate");
$cancelSlot = $dayAvail['body']['data']['available'][0] ?? null;
assertTrue($cancelSlot !== null, 'Find slot for cancel flow', $results);

$cancelCreate = request('POST', "$base/appointments/index.php", [
    'appointment_date' => $pickDate,
    'appointment_time' => $cancelSlot,
    'purpose' => 'Cancel audit appointment',
]);
$cancelId = (int) ($cancelCreate['body']['data']['id'] ?? 0);
assertTrue($cancelId > 0, 'Second appointment for cancel audit', $results);

resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
request('PATCH', "$base/appointments/index.php", ['id' => $cancelId, 'status' => 'Approved']);
request('PATCH', "$base/appointments/index.php", ['id' => $cancelId, 'status' => 'Cancelled']);

resetSession();
request('POST', "$base/auth/login.php", ['email' => $email, 'password' => $password]);
$userNotifs = request('GET', "$base/notifications/index.php")['body']['data']['notifications'] ?? [];
assertTrue(
    countNotifs($userNotifs, 'Cancelled', $cancelId) >= 1,
    'Appointment Cancelled — parishioner notification sent',
    $results
);

resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
$smsLogs = request('GET', "$base/sms/index.php")['body']['data']['logs'] ?? [];
assertTrue(
    countSmsForUser($smsLogs, $userId, 'has been cancelled') >= 1,
    'Appointment Cancelled — SMS logged',
    $results
);

$reportsAfter = request('GET', "$base/reports/summary.php");
$pendingReportAfter = (int) ($reportsAfter['body']['data']['pending_appointments'] ?? 0);
assertTrue(
    isset($reportsAfter['body']['data']['monthly_appointments']),
    'Reports summary includes monthly_appointments',
    $results
);
assertTrue(
    is_array($reportsAfter['body']['data']['appointment_status'] ?? null),
    'Reports summary includes appointment_status breakdown',
    $results
);

$apptReport = request('GET', "$base/reports/appointments.php?period=monthly");
assertTrue($apptReport['status'] === 200, 'Reports appointments API', $results);
assertTrue(
    isset($apptReport['body']['data']['total']) && isset($apptReport['body']['data']['status_breakdown']),
    'Reports appointments includes total and status_breakdown',
    $results
);

$passed = count(array_filter($results, fn($r) => $r['pass']));
$failed = count($results) - $passed;
echo "\n=== Audit Summary: $passed passed, $failed failed ===\n";
exit($failed > 0 ? 1 : 0);
