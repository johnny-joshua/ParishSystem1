<?php

function parseIsoDate(string $date): ?DateTimeImmutable
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return null;
    }
    try {
        return new DateTimeImmutable($date);
    } catch (Throwable) {
        return null;
    }
}

function normalizeTime(string $time): string
{
    $time = trim($time);
    // Accept H:MM, HH:MM, HH:MM:SS, and MySQL fractional seconds
    if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?/', $time, $m)) {
        return sprintf('%02d:%02d:%02d', (int) $m[1], (int) $m[2], isset($m[3]) ? (int) $m[3] : 0);
    }
    return $time;
}

function parishTimezone(): DateTimeZone
{
    return new DateTimeZone('Asia/Manila');
}

function parishToday(): DateTimeImmutable
{
    return new DateTimeImmutable('today', parishTimezone());
}

function parishNow(): DateTimeImmutable
{
    return new DateTimeImmutable('now', parishTimezone());
}

/**
 * @param array<int, string> $times
 * @return array<int, string>
 */
function uniqueNormalizedTimes(array $times): array
{
    $normalized = array_map('normalizeTime', $times);
    return array_values(array_unique($normalized));
}

/**
 * Remove slots that have already started on the current parish day.
 *
 * @param array<int, string> $slots Times in HH:MM:SS
 * @return array<int, string>
 */
function filterPastAppointmentSlots(string $date, array $slots): array
{
    if ($date !== parishToday()->format('Y-m-d')) {
        return $slots;
    }

    $now = parishNow();
    return array_values(array_filter($slots, function (string $slot) use ($date, $now): bool {
        $slotAt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', "$date $slot", parishTimezone());
        if ($slotAt === false) {
            return false;
        }

        return $slotAt > $now;
    }));
}

function isAtLeastDaysAhead(string $date, int $days): bool
{
    $d = parseIsoDate($date);
    if (!$d) {
        return false;
    }
    $today = new DateTimeImmutable('today');
    $diff = $today->diff($d);
    if ($diff->invert === 1) {
        return false;
    }
    return ((int) $diff->days) >= $days;
}

/**
 * Holy Family Parish — single venue reservation schedule.
 *
 * Baptism:        Wed & Sat, 10:00 AM only
 * Wedding:        except Tue & Sun, 9:00 AM & 2:00 PM
 * Funeral:        except Tue & Sun, 9:00 AM & 2:00 PM
 * Private Mass:   reserve ≥1 week ahead; Mon/Wed–Sat 9:00 AM & 2:00 PM (shared venue)
 * Mass Intention: Mon 6 AM; Tue closed; Wed–Sat 6 AM; Sun 6 AM & 8 AM
 */
function allowedReservationSlots(string $serviceType, string $date): array
{
    $d = parseIsoDate($date);
    if (!$d) {
        return [];
    }
    $dow = (int) $d->format('w'); // 0=Sun ... 6=Sat

    // Closed days
    $isTuesday = $dow === 2;
    $isSunday = $dow === 0;
    $isWednesday = $dow === 3;
    $isSaturday = $dow === 6;
    $isMonday = $dow === 1;
    $isThursday = $dow === 4;
    $isFriday = $dow === 5;

    // Helpers
    $t0600 = '06:00:00';
    $t0800 = '08:00:00';
    $t0900 = '09:00:00';
    $t1000 = '10:00:00';
    $t1400 = '14:00:00';

    if ($serviceType === 'Baptism') {
        // Wednesday and Saturday only - 10am only
        return ($isWednesday || $isSaturday) ? [$t1000] : [];
    }

    if ($serviceType === 'Marriage' || $serviceType === 'Funeral') {
        // except Tuesday and Sunday - 9am and 2pm only
        if ($isTuesday || $isSunday) {
            return [];
        }
        return [$t0900, $t1400];
    }

    if ($serviceType === 'Private Mass') {
        // Reserve at least 1 week before schedule; single venue (Mon/Wed–Sat, 9am & 2pm)
        if (!isAtLeastDaysAhead($date, 7)) {
            return [];
        }
        if ($isTuesday || $isSunday) {
            return [];
        }
        return [$t0900, $t1400];
    }

    if ($serviceType === 'Mass Intention') {
        // Monday 6am, Tuesday closed, Wed/Thu/Fri/Sat 6am, Sunday 6am & 8am
        if ($isTuesday) {
            return [];
        }
        if ($isSunday) {
            return [$t0600, $t0800];
        }
        if ($isMonday || $isWednesday || $isThursday || $isFriday || $isSaturday) {
            return [$t0600];
        }
        return [];
    }

    return [];
}

/**
 * @param array<int, string> $bookedTimes Times already reserved at this date (HH:MM:SS)
 * @return array{status: string, available_count: int, total_slots: int}
 */
function reservationDateAvailability(string $serviceType, string $date, array $bookedTimes = []): array
{
    $d = parseIsoDate($date);
    if (!$d) {
        return ['status' => 'unavailable', 'available_count' => 0, 'total_slots' => 0];
    }

    $allowedSlots = allowedReservationSlots($serviceType, $date);
    if ($allowedSlots === []) {
        return ['status' => 'unavailable', 'available_count' => 0, 'total_slots' => 0];
    }

    $booked = array_values(array_intersect($allowedSlots, $bookedTimes));
    $available = array_values(array_diff($allowedSlots, $booked));
    $today = new DateTimeImmutable('today');

    if ($d < $today) {
        return [
            'status' => 'past',
            'available_count' => count($available),
            'total_slots' => count($allowedSlots),
        ];
    }

    return [
        'status' => empty($available) ? 'full' : 'available',
        'available_count' => count($available),
        'total_slots' => count($allowedSlots),
    ];
}

/**
 * Holy Family Parish — parish office appointment schedule.
 * 
 * Office hours: Monday and Wednesday to Saturday, 8:00 AM to 5:00 PM
 * Closed: Tuesday and Sunday; lunch break: 11:00 AM to 1:00 PM
 * Time slots: 30-minute intervals during the morning and afternoon windows
 */
function allowedAppointmentSlots(string $date): array
{
    $d = parseIsoDate($date);
    if (!$d) {
        return [];
    }
    $dow = (int) $d->format('w'); // 0=Sun ... 6=Sat

    // Closed on Tuesday and Sunday
    if ($dow === 0 || $dow === 2) {
        return [];
    }

    // Past dates not allowed (parish local date)
    $today = parishToday()->format('Y-m-d');
    if ($date < $today) {
        return [];
    }

    // Generate 30-minute slots for 8:00-11:00 AM and 1:00-5:00 PM.
    $slots = [];
    foreach ([[8, 11], [13, 17]] as [$startHour, $endHour]) {
        for ($hour = $startHour; $hour < $endHour; $hour++) {
            $slots[] = sprintf('%02d:00:00', $hour);
            $slots[] = sprintf('%02d:30:00', $hour);
        }
    }

    return array_values(array_unique($slots));
}

/**
 * Bookable slots for a date: office hours, minus past times today, minus booked times.
 *
 * @param array<int, string> $bookedTimes
 * @return array{slots: array<int, string>, available: array<int, string>, booked: array<int, string>}
 */
function appointmentSlotsForDate(string $date, array $bookedTimes = []): array
{
    $allowedSlots = filterPastAppointmentSlots($date, allowedAppointmentSlots($date));
    $booked = array_values(array_intersect($allowedSlots, uniqueNormalizedTimes($bookedTimes)));
    $available = array_values(array_diff($allowedSlots, $booked));

    return [
        'slots' => $available,
        'available' => $available,
        'booked' => $booked,
    ];
}

/**
 * @param array<int, string> $bookedTimes Times already booked at this date (HH:MM:SS)
 * @return array{status: string, available_count: int, total_slots: int}
 */
function appointmentDateAvailability(string $date, array $bookedTimes = []): array
{
    $d = parseIsoDate($date);
    if (!$d) {
        return ['status' => 'unavailable', 'available_count' => 0, 'total_slots' => 0];
    }

    $dow = (int) $d->format('w'); // 0=Sun ... 6=Sat
    if ($dow === 0 || $dow === 6) {
        return ['status' => 'unavailable', 'available_count' => 0, 'total_slots' => 0];
    }

    $today = parishToday()->format('Y-m-d');
    if ($date < $today) {
        return ['status' => 'past', 'available_count' => 0, 'total_slots' => 0];
    }

    $slotInfo = appointmentSlotsForDate($date, $bookedTimes);
    $allowedSlots = filterPastAppointmentSlots($date, allowedAppointmentSlots($date));
    if ($allowedSlots === []) {
        return ['status' => 'unavailable', 'available_count' => 0, 'total_slots' => 0];
    }

    $available = $slotInfo['available'];

    return [
        'status' => empty($available) ? 'full' : 'available',
        'available_count' => count($available),
        'total_slots' => count($allowedSlots),
    ];
}
