<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/schedule.php';
require_once __DIR__ . '/../../middleware/auth.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

try {
    $db = getDB();
    $now = parishNow();
    $today = $now->format('Y-m-d');
    $currentTime = $now->format('H:i:s');
    $reservations = $db->prepare(
        "SELECT r.id, r.service_type, r.reservation_date, r.reservation_time, r.status,
                r.requirements, r.service_details, u.fullname, u.email, u.phone
         FROM reservations r
         INNER JOIN users u ON u.id = r.user_id
                 WHERE r.status = 'Approved'
                     AND (r.reservation_date > ? OR (r.reservation_date = ? AND r.reservation_time >= ?))
         ORDER BY r.reservation_date, r.reservation_time, r.id"
    );
    $reservations->execute([$today, $today, $currentTime]);

    $events = [];
    foreach ($reservations->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $details = json_decode((string) ($row['service_details'] ?? ''), true);
        $details = is_array($details) ? $details : [];
        $legacyDetails = parseRequirementLines((string) ($row['requirements'] ?? ''));
        $details = array_merge($legacyDetails, $details);
        $displayName = $row['fullname'];
        if ($row['service_type'] === 'Marriage') {
            $bride = $details['bride_name'] ?? $details['Bride Name'] ?? '';
            $groom = $details['groom_name'] ?? $details['Groom Name'] ?? '';
            $displayName = trim($bride . ($bride && $groom ? ' & ' : '') . $groom) ?: $displayName;
        } elseif ($row['service_type'] === 'Funeral') {
            $displayName = $details['deceased_name'] ?? $details['Deceased Name'] ?? $displayName;
        } elseif ($row['service_type'] === 'Mass Intention') {
            $displayName = $details['intention_name'] ?? $details['Intention Name / Requested For'] ?? $displayName;
        } elseif ($row['service_type'] === 'Private Mass') {
            $displayName = $details['event_name'] ?? $details['Event / Occasion Name'] ?? $displayName;
        } elseif ($row['service_type'] === 'Baptism') {
            $displayName = $details['child_name'] ?? $details['Child Name'] ?? $displayName;
        }
        $events[] = [
            'id' => 'reservation-' . (int) $row['id'],
            'kind' => 'reservation',
            'record_id' => (int) $row['id'],
            'record_label' => 'RES-' . str_pad((string) $row['id'], 5, '0', STR_PAD_LEFT),
            'type' => $row['service_type'],
            'date' => $row['reservation_date'],
            'time' => $row['reservation_time'],
            'status' => $row['status'],
            'name' => $displayName,
            'details' => $details,
            'requirements' => $row['requirements'],
            'email' => $row['email'],
            'phone' => $row['phone'],
        ];
    }

    $appointments = $db->prepare(
        "SELECT a.id, a.appointment_date, a.appointment_time, a.purpose,
                a.status, u.fullname, u.email, u.phone
         FROM appointments a
         INNER JOIN users u ON u.id = a.user_id
                 WHERE a.status = 'Approved'
                     AND (a.appointment_date > ? OR (a.appointment_date = ? AND a.appointment_time >= ?))
         ORDER BY a.appointment_date, a.appointment_time, a.id"
    );
    $appointments->execute([$today, $today, $currentTime]);

    foreach ($appointments->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $events[] = [
            'id' => 'appointment-' . (int) $row['id'],
            'kind' => 'appointment',
            'record_id' => (int) $row['id'],
            'record_label' => 'APP-' . str_pad((string) $row['id'], 5, '0', STR_PAD_LEFT),
            'type' => 'Appointment',
            'date' => $row['appointment_date'],
            'time' => $row['appointment_time'],
            'status' => $row['status'],
            'name' => $row['fullname'],
            'purpose' => $row['purpose'],
            'email' => $row['email'],
            'phone' => $row['phone'],
        ];
    }

    usort($events, static fn (array $a, array $b): int => strcmp($a['date'] . ' ' . $a['time'], $b['date'] . ' ' . $b['time']));
    successResponse(['events' => $events, 'timezone' => 'Asia/Manila', 'today' => $today]);
} catch (Throwable $e) {
    error_log('Parish calendar load failed: ' . $e->getMessage());
    errorResponse('Unable to load the parish calendar right now.', 500);
}

function parseRequirementLines(string $requirements): array
{
    $details = [];
    foreach (preg_split('/\R/', $requirements) ?: [] as $line) {
        if (preg_match('/^\s*([^:]+):\s*(.+?)\s*$/', $line, $matches)) {
            $details[trim($matches[1])] = trim($matches[2]);
        }
    }
    return $details;
}
