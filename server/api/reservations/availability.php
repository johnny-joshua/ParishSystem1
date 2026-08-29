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

$serviceType = $_GET['service_type'] ?? '';
if (!$serviceType) {
    errorResponse('service_type parameter required.', 400);
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
        "SELECT reservation_date, reservation_time
         FROM reservations
         WHERE reservation_date BETWEEN ? AND ? AND status != 'Rejected'"
    );
    $stmt->execute([$monthStart->format('Y-m-d'), $monthEnd->format('Y-m-d')]);
    $rows = $stmt->fetchAll();

    $bookedByDate = [];
    foreach ($rows as $row) {
        $day = (string) ($row['reservation_date'] ?? '');
        $time = (string) ($row['reservation_time'] ?? '');
        if (!isset($bookedByDate[$day])) {
            $bookedByDate[$day] = [];
        }
        $bookedByDate[$day][] = $time;
    }

    $dates = [];
    $cursor = $monthStart;
    while ($cursor <= $monthEnd) {
        $day = $cursor->format('Y-m-d');
        $dates[$day] = reservationDateAvailability($serviceType, $day, $bookedByDate[$day] ?? []);
        $cursor = $cursor->modify('+1 day');
    }

    successResponse([
        'month' => $month,
        'service_type' => $serviceType,
        'dates' => $dates,
    ]);
}

$date = $_GET['date'] ?? '';
if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    errorResponse('Valid date parameter required (YYYY-MM-DD).', 400);
}

$allowedSlots = allowedReservationSlots($serviceType, $date);

if (empty($allowedSlots)) {
    successResponse([
        'date' => $date,
        'service_type' => $serviceType,
        'slots' => [],
        'available' => [],
        'booked' => [],
    ]);
}

$stmt = $db->prepare(
    "SELECT reservation_time FROM reservations WHERE reservation_date = ? AND status != 'Rejected'"
);
$stmt->execute([$date]);
$bookedAll = array_column($stmt->fetchAll(), 'reservation_time');

$booked = array_values(array_intersect($allowedSlots, $bookedAll));
$available = array_values(array_diff($allowedSlots, $booked));

$slots = array_map(function ($t) use ($booked) {
    return [
        'time' => $t,
        'status' => in_array($t, $booked, true) ? 'full' : 'available',
    ];
}, $allowedSlots);

successResponse([
    'date' => $date,
    'service_type' => $serviceType,
    'slots' => $slots,
    'booked' => $booked,
    'available' => $available,
]);
