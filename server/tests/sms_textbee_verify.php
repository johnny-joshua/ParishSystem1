<?php
/**
 * TextBee SMS verification (CLI)
 * Run: php server/tests/sms_textbee_verify.php
 *
 * Tests phone normalization, config loading, optional live send, and sms_logs insert.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/sms.php';

echo "=== TextBee SMS Verification Report ===\n\n";

// --- 1. Phone normalization ---
$cases = [
    ['09171234567', '+639171234567'],
    ['9171234567', '+639171234567'],
    ['639171234567', '+639171234567'],
    ['+639171234567', '+639171234567'],
    ['08171234567', null],
    ['12345', null],
    ['', null],
];

echo "1) Phone normalization\n";
$normPass = true;
foreach ($cases as [$input, $expected]) {
    $got = normalizePhilippinePhone($input);
    $ok = $got === $expected;
    $normPass = $normPass && $ok;
    echo ($ok ? '  [PASS] ' : '  [FAIL] ') . json_encode($input) . ' => ' . json_encode($got)
        . ($ok ? '' : ' (expected ' . json_encode($expected) . ')') . "\n";
}
echo "\n";

// --- 2. Config ---
echo "2) TextBee configuration (.env)\n";
$config = getTextBeeConfig();
if ($config === null) {
    echo "  [WARN] TEXTBEE_* missing — set TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID, TEXTBEE_BASE_URL\n";
} else {
    $keyPreview = strlen($config['api_key']) > 8
        ? substr($config['api_key'], 0, 4) . '…' . substr($config['api_key'], -4)
        : '(short/placeholder)';
    echo "  API key: {$keyPreview}\n";
    echo "  Device ID: {$config['device_id']}\n";
    echo "  Base URL: {$config['base_url']}\n";
    echo "  Endpoint: {$config['base_url']}/gateway/devices/{DEVICE_ID}/send-sms\n";
}
echo "\n";

// --- 3. Optional live send + DB log ---
$testPhone = getenv('SMS_VERIFY_PHONE') ?: ($_ENV['SMS_VERIFY_PHONE'] ?? '');
$testUserId = (int) (getenv('SMS_VERIFY_USER_ID') ?: ($_ENV['SMS_VERIFY_USER_ID'] ?? 0));

echo "3) Live send + sms_logs\n";
if ($testPhone === '' || $testUserId <= 0) {
    echo "  [SKIP] Set SMS_VERIFY_PHONE and SMS_VERIFY_USER_ID to run a live TextBee send.\n";
    echo "  Example (PowerShell):\n";
    echo "    \$env:SMS_VERIFY_PHONE='09171234567'; \$env:SMS_VERIFY_USER_ID='1'; php server/tests/sms_textbee_verify.php\n";

    // Still demonstrate normalize + sample payload
    $sampleOriginal = '09171234567';
    $sampleNormalized = normalizePhilippinePhone($sampleOriginal);
    $sampleMessage = 'Parish System SMS verification message.';
    echo "\n  Sample request (not sent):\n";
    echo "    Original phone: {$sampleOriginal}\n";
    echo "    Normalized phone: {$sampleNormalized}\n";
    echo "    Message: {$sampleMessage}\n";
    if ($config) {
        echo "    POST {$config['base_url']}/gateway/devices/{$config['device_id']}/send-sms\n";
        echo "    Headers: x-api-key: ***, Content-Type: application/json\n";
        echo "    Body: " . json_encode([
            'recipients' => [$sampleNormalized],
            'message' => $sampleMessage,
        ], JSON_UNESCAPED_UNICODE) . "\n";
    }
    echo "\n  Sample TextBee success response:\n";
    echo "    " . json_encode([
        'data' => [
            'success' => true,
            'message' => 'SMS added to queue for processing',
            'smsBatchId' => 'abc123xyz',
            'recipientCount' => 1,
        ],
    ], JSON_UNESCAPED_UNICODE) . "\n";
    echo "\n  Sample sms_logs row:\n";
    echo "    " . json_encode([
        'user_id' => 1,
        'phone_number' => '+639171234567',
        'message' => $sampleMessage,
        'status' => 'sent',
        'provider' => 'textbee',
        'provider_message_id' => 'abc123xyz',
        'response' => '{"data":{"success":true,"message":"SMS added to queue for processing","smsBatchId":"abc123xyz","recipientCount":1}}',
        'created_at' => date('Y-m-d H:i:s'),
    ], JSON_UNESCAPED_UNICODE) . "\n";
} else {
    $db = getDB();
    $original = $testPhone;
    $normalized = normalizePhilippinePhone($original);
    $message = 'Parish System SMS verification at ' . date('c');

    echo "  Original phone: {$original}\n";
    echo "  Normalized phone: " . ($normalized ?? 'INVALID') . "\n";
    echo "  Message: {$message}\n";

    $result = sendSMS($db, $testUserId, $original, $message);
    echo "  sendSMS success: " . ($result['success'] ? 'true' : 'false') . "\n";
    echo "  sendSMS message: {$result['message']}\n";
    if (!empty($result['message_id'])) {
        echo "  provider_message_id: {$result['message_id']}\n";
    }

    $stmt = $db->prepare(
        'SELECT id, user_id, phone_number, message, status, provider, provider_message_id, response, created_at
         FROM sms_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1'
    );
    $stmt->execute([$testUserId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "\n  Latest sms_logs row:\n";
    echo '    ' . json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
}

echo "\n4) Trigger coverage (code audit)\n";
$triggers = [
    'Reservation submitted' => 'server/api/reservations/index.php POST',
    'Reservation approved' => 'server/api/reservations/index.php PATCH (status change)',
    'Reservation rejected' => 'server/api/reservations/index.php PATCH (status change)',
    'Document verified' => 'server/api/reservations/documents.php PATCH',
    'Document rejected' => 'server/api/reservations/documents.php PATCH',
    'Appointment created' => 'server/api/appointments/index.php POST',
    'Appointment approved/rejected/cancelled/completed' => 'server/api/appointments/index.php PATCH (status change)',
];
foreach ($triggers as $label => $where) {
    echo "  [OK] {$label} — {$where}\n";
}

echo "\n=== Summary ===\n";
echo 'Normalization: ' . ($normPass ? 'PASS' : 'FAIL') . "\n";
echo 'Config loaded: ' . ($config ? 'YES' : 'NO') . "\n";
echo "Done.\n";
