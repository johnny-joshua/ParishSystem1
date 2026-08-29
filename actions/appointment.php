<?php

/**
 * LEGACY appointment action handler — DISABLED.
 *
 * The React/Vite SPA (client/src/pages/Appointment.jsx and AdminAppointments.jsx)
 * manages appointments through server/api/appointments/index.php, which enforces
 * office hours, weekend/past-date rules, double-booking prevention, notifications,
 * and SMS. This legacy POST endpoint must not write to the appointments table.
 */

require_once __DIR__ . '/../includes/init.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !verifyCsrf()) {
    setFlash('danger', 'Invalid request.');
    redirect(appUrl('index.php'));
}

$action = $_POST['action'] ?? 'create';
$redirect = $action === 'update_status'
    ? appUrl('admin/appointments.php')
    : appUrl('parishioner/appointments.php');

setFlash(
    'warning',
    'Legacy appointment actions are disabled. Use the React application for creating and managing appointments.'
);
redirect($redirect);
