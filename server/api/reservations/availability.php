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

        $serviceFilter = $serviceType === 'Mass Intention' ? ' AND service_type = ?' : '';
        $stmt = $db->prepare(
                "SELECT reservation_date, reservation_time, COUNT(*) AS reservation_count
                 FROM reservations
                 WHERE reservation_date BETWEEN ? AND ?
                     AND status IN ('Pending', 'Under Review', 'Approved'){$serviceFilter}
                 GROUP BY reservation_date, reservation_time"
        );
        $params = [$monthStart->format('Y-m-d'), $monthEnd->format('Y-m-d')];
        if ($serviceFilter !== '') $params[] = $serviceType;
        $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $bookedByDate = [];
    foreach ($rows as $row) {
        $day = (string) ($row['reservation_date'] ?? '');
        $time = (string) ($row['reservation_time'] ?? '');
        if (!isset($bookedByDate[$day])) {
            $bookedByDate[$day] = [];
        }
        $bookedByDate[$day][$time] = (int) $row['reservation_count'];
    }

    $dates = [];
    $cursor = $monthStart;
    while ($cursor <= $monthEnd) {
        $day = $cursor->format('Y-m-d');
        $allowed = allowedReservationSlots($serviceType, $day);
        if (in_array($serviceType, ['Mass Intention', 'Funeral', 'Private Mass'], true)) {
            $allowed = filterPastAppointmentSlots($day, $allowed);
        }
        if ($serviceType === 'Mass Intention') {
            $fullCount = 0;
            foreach ($allowed as $slot) {
                if (($bookedByDate[$day][$slot] ?? 0) >= 15) $fullCount++;
            }
            $dates[$day] = [
                'status' => $allowed === [] ? 'unavailable' : ($fullCount === count($allowed) ? 'full' : 'available'),
                'available_count' => count($allowed) - $fullCount,
                'total_slots' => count($allowed),
            ];
        } elseif ($serviceType === 'Baptism') {
            $capacity = 20;
            $fullCount = 0;
            foreach ($allowed as $slot) {
                if (($bookedByDate[$day][$slot] ?? 0) >= $capacity) $fullCount++;
            }
            $dates[$day] = [
                'status' => $allowed === [] ? 'unavailable' : ($fullCount === count($allowed) ? 'full' : 'available'),
                'available_count' => count($allowed) - $fullCount,
                'total_slots' => count($allowed),
            ];
        } else {
            $dates[$day] = reservationDateAvailability($serviceType, $day, array_keys($bookedByDate[$day] ?? []));
        }
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

if (in_array($serviceType, ['Mass Intention', 'Funeral', 'Private Mass'], true)) {
    $allowedSlots = filterPastAppointmentSlots($date, $allowedSlots);
}

if (empty($allowedSlots)) {
    successResponse([
        'date' => $date,
        'service_type' => $serviceType,
        'slots' => [],
        'available' => [],
        'booked' => [],
    ]);
}

$serviceFilter = $serviceType === 'Mass Intention' ? ' AND service_type = ?' : '';
$stmt = $db->prepare(
    "SELECT reservation_time, COUNT(*) AS reservation_count
     FROM reservations
     WHERE reservation_date = ? AND status IN ('Pending', 'Under Review', 'Approved'){$serviceFilter}
     GROUP BY reservation_time"
);
$params = [$date];
if ($serviceFilter !== '') $params[] = $serviceType;
$stmt->execute($params);
$counts = [];
foreach ($stmt->fetchAll() as $row) $counts[(string) $row['reservation_time']] = (int) $row['reservation_count'];

$capacity = $serviceType === 'Mass Intention' ? 15 : ($serviceType === 'Baptism' ? 20 : 1);
$available = array_values(array_filter($allowedSlots, fn ($time) => ($counts[$time] ?? 0) < $capacity));
$slots = array_map(function ($time) use ($counts, $capacity) {
    $count = $counts[$time] ?? 0;
    return [
        'time' => $time,
        'status' => $count >= $capacity ? 'full' : 'available',
        'reservation_count' => $count,
        'capacity' => $capacity,
        'remaining' => max(0, $capacity - $count),
    ];
}, $allowedSlots);

$booked = array_values(array_filter($allowedSlots, fn ($time) => ($counts[$time] ?? 0) >= $capacity));

successResponse([
    'date' => $date,
    'service_type' => $serviceType,
    'slots' => $slots,
    'booked' => $booked,
    'available' => $available,
]);
