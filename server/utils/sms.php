<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Validate and normalize Philippine mobile phone number for TextBee (E.164).
 * Accepted: 09171234567, 9171234567, 639171234567, +639171234567
 * Returns: +639171234567 or null if invalid
 */
function normalizePhilippinePhone(?string $phone): ?string
{
    if ($phone === null || trim($phone) === '') {
        return null;
    }

    $raw = trim($phone);
    $hasPlus = str_starts_with($raw, '+');
    $digits = preg_replace('/[^0-9]/', '', $raw);

    // Already +63… keep if valid mobile (+639XXXXXXXXX)
    if ($hasPlus && preg_match('/^639[0-9]{9}$/', $digits)) {
        return '+' . $digits;
    }

    // 09XXXXXXXXX → replace leading 0 with +63 → +639XXXXXXXXX
    if (preg_match('/^09[0-9]{9}$/', $digits)) {
        return '+63' . substr($digits, 1);
    }

    // 9XXXXXXXXX (10 digits starting with 9) → prepend +63
    if (preg_match('/^9[0-9]{9}$/', $digits)) {
        return '+63' . $digits;
    }

    // 639XXXXXXXXX → prepend +
    if (preg_match('/^639[0-9]{9}$/', $digits)) {
        return '+' . $digits;
    }

    return null;
}

/**
 * Get TextBee configuration from environment
 * Returns array with API key, device ID, and base URL
 * Returns null if configuration is missing
 */
function getTextBeeConfig(): ?array
{
    $apiKey = getenv('TEXTBEE_API_KEY') ?: ($_ENV['TEXTBEE_API_KEY'] ?? '');
    $deviceId = getenv('TEXTBEE_DEVICE_ID') ?: ($_ENV['TEXTBEE_DEVICE_ID'] ?? '');
    $baseUrl = getenv('TEXTBEE_BASE_URL') ?: ($_ENV['TEXTBEE_BASE_URL'] ?? '');

    if ($apiKey === '' || $deviceId === '' || $baseUrl === '') {
        error_log('TextBee configuration missing. Please set TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID, and TEXTBEE_BASE_URL in .env');
        return null;
    }

    return [
        'api_key' => $apiKey,
        'device_id' => $deviceId,
        'base_url' => rtrim($baseUrl, '/'),
    ];
}

/**
 * Log SMS attempt to database (sms_logs.response stores provider response body)
 */
function logSMSAttempt(PDO $db, int $userId, string $phoneNumber, string $message, string $status, ?string $providerMessageId = null, ?string $response = null): bool
{
    try {
        $stmt = $db->prepare(
            'INSERT INTO sms_logs (user_id, phone_number, message, status, provider, provider_message_id, response, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([
            $userId,
            $phoneNumber,
            $message,
            $status,
            'textbee',
            $providerMessageId,
            $response,
        ]);
        return true;
    } catch (Throwable $e) {
        error_log('SMS log insert failed: ' . $e->getMessage());
        return false;
    }
}

/**
 * Send SMS via TextBee REST API.
 * Failures are logged and returned — never thrown to callers.
 *
 * @return array{success: bool, message: string, message_id?: string|null}
 */
function sendSMS(PDO $db, int $userId, string $phoneNumber, string $message): array
{
    try {
        $originalPhone = $phoneNumber;
        $normalizedPhone = normalizePhilippinePhone($phoneNumber);

        error_log('[SMS] Original phone: ' . $originalPhone);
        error_log('[SMS] Normalized phone: ' . ($normalizedPhone ?? 'INVALID'));

        if ($normalizedPhone === null) {
            $errorMsg = "Invalid Philippine phone number: {$phoneNumber}";
            error_log('[SMS] ' . $errorMsg);
            logSMSAttempt($db, $userId, $phoneNumber, $message, 'failed', null, $errorMsg);
            return [
                'success' => false,
                'message' => $errorMsg,
            ];
        }

        $config = getTextBeeConfig();
        if ($config === null) {
            $errorMsg = 'TextBee configuration missing';
            error_log('[SMS] ' . $errorMsg);
            logSMSAttempt($db, $userId, $normalizedPhone, $message, 'failed', null, $errorMsg);
            return [
                'success' => false,
                'message' => $errorMsg,
            ];
        }

        // Official TextBee endpoint: device ID in path; auth via x-api-key header
        $url = $config['base_url'] . '/gateway/devices/' . rawurlencode($config['device_id']) . '/send-sms';
        $postData = [
            'recipients' => [$normalizedPhone],
            'message' => $message,
        ];

        error_log('[SMS] TextBee endpoint: ' . $url);
        error_log('[SMS] Payload: ' . json_encode([
            'deviceId' => $config['device_id'],
            'phone' => $normalizedPhone,
            'message' => $message,
            'recipients' => $postData['recipients'],
        ]));

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json',
            'x-api-key: ' . $config['api_key'],
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        error_log('[SMS] HTTP status: ' . $httpCode);
        error_log('[SMS] HTTP response: ' . ($curlError !== '' ? ('cURL error: ' . $curlError) : (string) $response));
        error_log('[SMS] Response body: ' . (string) $response);

        if ($curlError) {
            $errorMsg = "cURL error: {$curlError}";
            logSMSAttempt($db, $userId, $normalizedPhone, $message, 'failed', null, $errorMsg);
            return [
                'success' => false,
                'message' => $errorMsg,
            ];
        }

        $responseData = json_decode((string) $response, true);
        $responseBody = is_string($response) ? $response : json_encode($responseData);
        $data = (is_array($responseData) && isset($responseData['data']) && is_array($responseData['data']))
            ? $responseData['data']
            : (is_array($responseData) ? $responseData : []);

        // TextBee wraps success in data.success; also accept 2xx without an error field
        if (array_key_exists('success', $data)) {
            $apiSuccess = $httpCode >= 200 && $httpCode < 300 && $data['success'] === true;
        } elseif (is_array($responseData) && array_key_exists('success', $responseData)) {
            $apiSuccess = $httpCode >= 200 && $httpCode < 300 && $responseData['success'] === true;
        } else {
            $apiSuccess = $httpCode >= 200 && $httpCode < 300
                && is_array($responseData)
                && !isset($responseData['error']);
        }

        if ($apiSuccess) {
            $providerMessageId = $data['smsBatchId']
                ?? $data['message_id']
                ?? ($responseData['message_id'] ?? null);
            if ($providerMessageId !== null) {
                $providerMessageId = (string) $providerMessageId;
            }
            logSMSAttempt($db, $userId, $normalizedPhone, $message, 'sent', $providerMessageId, $responseBody);
            return [
                'success' => true,
                'message' => 'SMS sent successfully',
                'message_id' => $providerMessageId,
            ];
        }

        $apiError = (is_array($responseData) ? ($responseData['error'] ?? $responseData['message'] ?? null) : null)
            ?? ($data['message'] ?? 'Unknown API error');
        logSMSAttempt($db, $userId, $normalizedPhone, $message, 'failed', null, $responseBody);
        return [
            'success' => false,
            'message' => "TextBee API error (HTTP {$httpCode}): {$apiError}",
        ];
    } catch (Throwable $e) {
        $errorMsg = 'SMS unexpected error: ' . $e->getMessage();
        error_log('[SMS] ' . $errorMsg);
        try {
            logSMSAttempt($db, $userId, $phoneNumber, $message, 'failed', null, $errorMsg);
        } catch (Throwable $ignored) {
            // never break caller
        }
        return [
            'success' => false,
            'message' => $errorMsg,
        ];
    }
}
