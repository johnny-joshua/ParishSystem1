<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../middleware/auth.php';

$auth = requireAuth();
$db = getDB();
$userId = (int) $auth['user_id'];

function readAppointmentUpdatesPreference(PDO $db, int $userId): bool
{
    try {
        $stmt = $db->prepare('SELECT appointment_updates FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $value = $stmt->fetchColumn();
        if ($value === false) {
            return true;
        }
        return (int) $value === 1;
    } catch (Throwable $e) {
        // Column missing on older DBs — treat as enabled.
        error_log('settings preference read failed: ' . $e->getMessage());
        return true;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    successResponse([
        'appointment_updates' => readAppointmentUpdatesPreference($db, $userId),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $data = getJsonInput();

    if (!array_key_exists('appointment_updates', $data)) {
        errorResponse('appointment_updates is required.', 422, [
            'appointment_updates' => 'This field is required.',
        ]);
    }

    $raw = $data['appointment_updates'];
    if (is_bool($raw)) {
        $enabled = $raw;
    } elseif (is_int($raw) || (is_string($raw) && ctype_digit($raw))) {
        $enabled = ((int) $raw) === 1;
    } elseif (is_string($raw)) {
        $parsed = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($parsed === null) {
            errorResponse('appointment_updates must be a boolean.', 422, [
                'appointment_updates' => 'Must be true or false.',
            ]);
        }
        $enabled = $parsed;
    } else {
        errorResponse('appointment_updates must be a boolean.', 422, [
            'appointment_updates' => 'Must be true or false.',
        ]);
    }

    try {
        $stmt = $db->prepare('UPDATE users SET appointment_updates = ? WHERE id = ?');
        $stmt->execute([$enabled ? 1 : 0, $userId]);
    } catch (Throwable $e) {
        error_log('settings preference update failed: ' . $e->getMessage());
        errorResponse('Unable to save notification preference. Please run the database migration.', 500);
    }

    successResponse([
        'appointment_updates' => $enabled,
    ], 'Settings updated.');
}

errorResponse('Method not allowed.', 405);
