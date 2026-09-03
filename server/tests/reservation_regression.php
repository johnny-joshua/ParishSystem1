<?php
/**
 * Reservation module regression test (CLI)
 * Run: php server/tests/reservation_regression.php
 */

declare(strict_types=1);

$base = getenv('API_BASE') ?: 'http://localhost/ParishSystem1/server/api';
$cookieFile = sys_get_temp_dir() . '/parish_regression_cookies.txt';
@unlink($cookieFile);

function request(string $method, string $url, ?array $json = null, $multipart = null, array $extraHeaders = []): array
{
    global $cookieFile;

    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    foreach ($extraHeaders as $h) {
        $headers[] = $h;
    }

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
    } elseif ($multipart !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $multipart);
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

function resetSession(): void
{
    global $cookieFile;
    @unlink($cookieFile);
}

function assertTrue(bool $cond, string $label, array &$results): void
{
    $results[] = ['pass' => $cond, 'label' => $label];
    echo ($cond ? '[PASS] ' : '[FAIL] ') . $label . PHP_EOL;
}

$results = [];
$testEmail = 'regression_test_' . time() . '@gmail.com';
$testPassword = 'TestPass123!';

echo "=== Reservation Module Regression ===\n";
echo "API base: $base\n\n";

// Unauthenticated me.php should return 401 (not 500)
$meGuest = request('GET', "$base/auth/me.php");
assertTrue($meGuest['status'] === 401, 'Guest me.php returns 401', $results);

// Register test user
$reg = request('POST', "$base/auth/register.php", [
    'fullname' => 'Regression Tester',
    'email' => $testEmail,
    'phone' => '09170000001',
    'address' => 'Test Address',
    'password' => $testPassword,
    'confirm_password' => $testPassword,
]);
assertTrue($reg['status'] === 201 || $reg['status'] === 200, 'Register test user', $results);

// Login
$login = request('POST', "$base/auth/login.php", [
    'email' => $testEmail,
    'password' => $testPassword,
]);
assertTrue($login['status'] === 200, 'Login test user', $results);

$meUser = request('GET', "$base/auth/me.php");
assertTrue($meUser['status'] === 200, 'Authenticated me.php returns 200', $results);

// Find available slot for Baptism (only 2 required docs)
$pickDate = null;
$pickTime = null;
$scanMonth = new DateTimeImmutable('first day of this month');
for ($m = 0; $m < 4 && $pickDate === null; $m++) {
    $month = $scanMonth->format('Y-m');
    $avail = request('GET', "$base/reservations/availability.php?month=$month&service_type=Baptism");
    assertTrue($m === 0 ? $avail['status'] === 200 : true, 'Monthly availability loads', $results);

    if (!empty($avail['body']['data']['dates'])) {
        foreach ($avail['body']['data']['dates'] as $date => $info) {
            if (($info['status'] ?? '') === 'available' && $date >= date('Y-m-d')) {
                $dayAvail = request('GET', "$base/reservations/availability.php?date=$date&service_type=Baptism");
                foreach ($dayAvail['body']['data']['available'] ?? [] as $slot) {
                    $pickDate = $date;
                    $pickTime = $slot;
                    break 2;
                }
            }
        }
    }
    $scanMonth = $scanMonth->modify('+1 month');
}

assertTrue($pickDate !== null && $pickTime !== null, 'Find available Baptism slot', $results);

$reservationId = 0;
$smsCountBefore = 0;
if ($pickDate) {
    $create = request('POST', "$base/reservations/index.php", [
        'service_type' => 'Baptism',
        'reservation_date' => $pickDate,
        'reservation_time' => $pickTime,
        'requirements' => 'Regression test reservation',
    ]);
    assertTrue(
        $create['status'] === 201,
        'Create reservation (status ' . $create['status'] . ': ' . ($create['body']['message'] ?? $create['raw']) . ')',
        $results
    );
    $reservationId = (int) ($create['body']['data']['id'] ?? 0);
    assertTrue($reservationId > 0, 'Reservation ID returned', $results);

    // Notifications after creation
    $notifs = request('GET', "$base/notifications/index.php");
    assertTrue($notifs['status'] === 200, 'Notifications API loads', $results);
    $hasReservationNotif = false;
    foreach ($notifs['body']['data']['notifications'] ?? [] as $n) {
        if (($n['reference_type'] ?? '') === 'reservation' && (int) ($n['reference_id'] ?? 0) === $reservationId) {
            $hasReservationNotif = true;
            break;
        }
    }
    assertTrue($hasReservationNotif, 'User notification created on reservation submit', $results);
}

// Create test PNG file
$tmpFile = sys_get_temp_dir() . '/birth_certificate_test.png';
file_put_contents($tmpFile, base64_decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
));

if ($reservationId > 0) {
    // Correct upload with curl multipart
    $correct = request('POST', "$base/reservations/documents.php", null, [
        'reservation_id' => (string) $reservationId,
        'document_type' => 'birth_certificate',
        'document' => new CURLFile($tmpFile, 'image/png', 'birth_certificate.png'),
    ]);
    assertTrue($correct['status'] === 201, 'Document upload succeeds', $results);

    $list = request('GET', "$base/reservations/documents.php?reservation_id=$reservationId");
    assertTrue($list['status'] === 200, 'List reservation documents', $results);
    $docCount = count($list['body']['data']['documents'] ?? []);
    assertTrue($docCount >= 1, 'Document appears in list', $results);

    $documentId = (int) ($list['body']['data']['documents'][0]['id'] ?? 0);

    // Admin login
    resetSession();
    $adminLogin = request('POST', "$base/auth/login.php", [
        'email' => 'admin@holyfamilyparish.com',
        'password' => 'admin123',
    ]);
    assertTrue($adminLogin['status'] === 200, 'Admin login', $results);

    // Admin review list
    $adminList = request('GET', "$base/reservations/index.php?status=Pending");
    assertTrue($adminList['status'] === 200, 'Admin reservation review list', $results);
    $foundPending = false;
    foreach ($adminList['body']['data']['reservations'] ?? [] as $row) {
        if ((int) ($row['id'] ?? 0) === $reservationId) {
            $foundPending = true;
            break;
        }
    }
    assertTrue($foundPending, 'New reservation visible in admin pending list', $results);

    // Cannot approve with pending docs
    $approveFail = request('PATCH', "$base/reservations/index.php", [
        'id' => $reservationId,
        'status' => 'Approved',
    ]);
    assertTrue($approveFail['status'] === 422, 'Cannot approve with pending documents', $results);

    // Reject document (requires replacement)
    if ($documentId > 0) {
        $reject = request('PATCH', "$base/reservations/documents.php", [
            'document_id' => $documentId,
            'status' => 'Rejected',
            'remarks' => 'Document is blurry, please re-upload.',
        ]);
        assertTrue($reject['status'] === 200, 'Admin reject document', $results);
    }

    // User replaces rejected document
    resetSession();
    request('POST', "$base/auth/login.php", ['email' => $testEmail, 'password' => $testPassword]);

    $deleteRejected = request('DELETE', "$base/reservations/documents.php?id=$documentId");
    assertTrue($deleteRejected['status'] === 200, 'User delete rejected document for replacement', $results);

    $replace = request('POST', "$base/reservations/documents.php", null, [
        'reservation_id' => (string) $reservationId,
        'document_type' => 'birth_certificate',
        'document' => new CURLFile($tmpFile, 'image/png', 'birth_certificate_replacement.png'),
    ]);
    assertTrue($replace['status'] === 201, 'Document replacement upload succeeds', $results);

    // Upload second required doc
    $tmpFile2 = sys_get_temp_dir() . '/parent_valid_id_test.png';
    copy($tmpFile, $tmpFile2);
    $upload2 = request('POST', "$base/reservations/documents.php", null, [
        'reservation_id' => (string) $reservationId,
        'document_type' => 'parent_valid_id',
        'document' => new CURLFile($tmpFile2, 'image/png', 'parent_valid_id.png'),
    ]);
    assertTrue($upload2['status'] === 201, 'Upload second required document', $results);

    // Admin verify all and approve
    resetSession();
    request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
    $list2 = request('GET', "$base/reservations/documents.php?reservation_id=$reservationId");
    foreach ($list2['body']['data']['documents'] ?? [] as $doc) {
        if ($doc['status'] === 'Pending') {
            request('PATCH', "$base/reservations/documents.php", [
                'document_id' => $doc['id'],
                'status' => 'Verified',
            ]);
        }
    }

    $summary = request('GET', "$base/reservations/documents.php?reservation_id=$reservationId");
    $complete = (bool) ($summary['body']['data']['document_summary']['complete'] ?? false);
    assertTrue($complete, 'All required documents verified (summary complete)', $results);

    $approveOk = request('PATCH', "$base/reservations/index.php", [
        'id' => $reservationId,
        'status' => 'Approved',
    ]);
    assertTrue($approveOk['status'] === 200, 'Approve reservation when docs complete', $results);

    // Status update to Completed
    $completeRes = request('PATCH', "$base/reservations/index.php", [
        'id' => $reservationId,
        'status' => 'Completed',
    ]);
    assertTrue($completeRes['status'] === 200, 'Mark reservation Completed', $results);

    // Download document
    $list3 = request('GET', "$base/reservations/documents.php?reservation_id=$reservationId");
    $downloadId = (int) ($list3['body']['data']['documents'][0]['id'] ?? 0);
    if ($downloadId > 0) {
        $dl = request('GET', "$base/reservations/download.php?id=$downloadId");
        assertTrue($dl['status'] === 200, 'Download document', $results);
    }

    // User notifications after approval
    resetSession();
    request('POST', "$base/auth/login.php", ['email' => $testEmail, 'password' => $testPassword]);
    $userNotifs = request('GET', "$base/notifications/index.php");
    $hasApprovedNotif = false;
    foreach ($userNotifs['body']['data']['notifications'] ?? [] as $n) {
        if (stripos((string) ($n['title'] ?? ''), 'Approved') !== false) {
            $hasApprovedNotif = true;
            break;
        }
    }
    assertTrue($hasApprovedNotif, 'User notification on reservation approval', $results);
}

// Requirements endpoint
$req = request('GET', "$base/reservations/requirements.php");
assertTrue($req['status'] === 200 && isset($req['body']['data']['Marriage']), 'Document requirements API', $results);

// Dashboard stats (admin)
resetSession();
request('POST', "$base/auth/login.php", ['email' => 'admin@holyfamilyparish.com', 'password' => 'admin123']);
$stats = request('GET', "$base/dashboard/stats.php");
assertTrue($stats['status'] === 200, 'Dashboard stats API', $results);
assertTrue(isset($stats['body']['data']['stats']['pending_reservations']), 'Dashboard pending_reservations count', $results);

// Reports summary
$reportSummary = request('GET', "$base/reports/summary.php");
assertTrue($reportSummary['status'] === 200, 'Reports summary API (status ' . $reportSummary['status'] . ')', $results);

$reportRes = request('GET', "$base/reports/reservations.php");
assertTrue($reportRes['status'] === 200, 'Reports reservations API', $results);

// SMS logs (admin) — logs attempt even if TextBee not configured
$smsLogs = request('GET', "$base/sms/index.php");
assertTrue($smsLogs['status'] === 200, 'SMS logs API', $results);

$passed = count(array_filter($results, fn($r) => $r['pass']));
$failed = count($results) - $passed;

echo "\n=== Summary: $passed passed, $failed failed ===\n";
exit($failed > 0 ? 1 : 0);
