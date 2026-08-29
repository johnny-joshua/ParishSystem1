<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/schedule.php';

requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

$db = getDB();
$month = $_GET['month'] ?? '';
if ($month !== '') {
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        errorResponse('Valid month parameter required (YYYY-MM).', 400);
    }

    try {
        $monthStart = new DateTimeImmutable($month . '-01');
    } catch (Throwable) {
        errorResponse('Valid month parameter required (YYYY-MM).', 400);
    }
    $monthEnd = $monthStart->modify('last day of this month');

    $stmt = $db->prepare(
        "SELECT appointment_date, appointment_time
         FROM appointments
         WHERE appointment_date BETWEEN ? AND ? AND status != 'Rejected' AND status != 'Cancelled'"
    );
    $stmt->execute([$monthStart->format('Y-m-d'), $monthEnd->format('Y-m-d')]);
    $rows = $stmt->fetchAll();

    $bookedByDate = [];
    foreach ($rows as $row) {
        $day = (string) ($row['appointment_date'] ?? '');
        $time = normalizeTime((string) ($row['appointment_time'] ?? ''));
        if ($day === '' || $time === '') {
            continue;
        }
        if (!isset($bookedByDate[$day])) {
            $bookedByDate[$day] = [];
        }
        $bookedByDate[$day][] = $time;
    }
    foreach ($bookedByDate as $day => $times) {
        $bookedByDate[$day] = uniqueNormalizedTimes($times);
    }

    $dates = [];
    $cursor = $monthStart;
    while ($cursor <= $monthEnd) {
        $day = $cursor->format('Y-m-d');
        $dates[$day] = appointmentDateAvailability($day, $bookedByDate[$day] ?? []);
        $cursor = $cursor->modify('+1 day');
    }

    successResponse([
        'month' => $month,
        'dates' => $dates,
    ]);
}

$date = $_GET['date'] ?? '';
if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    errorResponse('Valid date parameter required (YYYY-MM-DD).', 400);
}

$stmt = $db->prepare(
    "SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status != 'Rejected' AND status != 'Cancelled'"
);
$stmt->execute([$date]);
$bookedAll = uniqueNormalizedTimes(array_column($stmt->fetchAll(), 'appointment_time'));

$slotInfo = appointmentSlotsForDate($date, $bookedAll);
$available = $slotInfo['available'];
$booked = $slotInfo['booked'];

// Only return bookable slots; fully booked and past slots are omitted from the picker.
$slots = array_map(static fn(string $t): array => [
    'time' => $t,
    'status' => 'available',
], $available);

successResponse([
    'date' => $date,
    'slots' => $slots,
    'booked' => $booked,
    'available' => $available,
]);
