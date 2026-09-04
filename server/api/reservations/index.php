<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/schedule.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/notifications.php';
require_once __DIR__ . '/../../utils/sms.php';
require_once __DIR__ . '/../../utils/documents.php';
require_once __DIR__ . '/../../utils/upload.php';

$auth = requireAuth();
$db = getDB();
$isAdmin = ($auth['role'] ?? '') === 'admin';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = $_GET['status'] ?? '';
    if ($isAdmin) {
        $sql = 'SELECT r.*, u.fullname, u.email, u.phone, u.address FROM reservations r JOIN users u ON r.user_id = u.id WHERE 1=1';
        $params = [];
        if ($status !== '') {
            if ($status === 'Pending') {
                $sql .= " AND r.status IN ('Pending', 'Under Review')";
            } else {
                $sql .= ' AND r.status = ?';
                $params[] = $status;
            }
        }
        $sql .= ' ORDER BY r.created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    } else {
        $sql = 'SELECT * FROM reservations WHERE user_id = ?';
        $params = [(int) $auth['user_id']];
        if ($status !== '') {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }
    successResponse(['reservations' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($isAdmin) {
        errorResponse('Admins cannot create reservations via this endpoint.', 403);
    }
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $data = str_contains($contentType, 'multipart/form-data') ? $_POST : getJsonInput();
    $errors = validateRequired(['service_type', 'reservation_date', 'reservation_time'], $data);
    if (!empty($errors)) {
        errorResponse('Validation failed.', 422, $errors);
    }
    if (!in_array($data['service_type'], allowedServiceTypes(), true)) {
        errorResponse('Invalid service type.', 422);
    }

    $date = (string) ($data['reservation_date'] ?? '');
    $time = normalizeTime((string) ($data['reservation_time'] ?? ''));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        errorResponse('Invalid reservation_date.', 422, ['reservation_date' => 'Please choose a valid date.']);
    }
    if ($date < parishToday()->format('Y-m-d')) {
        errorResponse('Reservation date cannot be in the past.', 422, ['reservation_date' => 'Please choose today or a future date.']);
    }
    if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $time)) {
        errorResponse('Invalid reservation_time.', 422, ['reservation_time' => 'Please choose a valid time slot.']);
    }

    $isMassIntention = $data['service_type'] === 'Mass Intention';
    $isFuneral = $data['service_type'] === 'Funeral';
    $isPrivateMass = $data['service_type'] === 'Private Mass';
    if ($isMassIntention || $isPrivateMass) {
        $requiredFileType = $isMassIntention ? 'payment_receipt' : 'valid_id';
        $massErrors = $isMassIntention
            ? validateRequired(['intention_name', 'prayer_intention'], $data)
            : [];
        if (!isset($_FILES[$requiredFileType]) || !is_uploaded_file($_FILES[$requiredFileType]['tmp_name'])) {
            $massErrors[$requiredFileType] = $isMassIntention ? 'Payment receipt / proof of payment is required.' : 'A valid ID is required.';
        }
        if (!empty($massErrors)) {
            errorResponse('Mass Intention validation failed.', 422, $massErrors);
        }
    }
    $serviceDetails = is_array($data['serviceDetails'] ?? null)
        ? $data['serviceDetails']
        : json_decode((string) ($data['serviceDetails'] ?? ''), true);
    $serviceDetails = is_array($serviceDetails) ? $serviceDetails : [];
    if ($isFuneral) {
        $funeralErrors = validateRequired(
            ['deceased_name', 'date_of_death', 'age', 'sex', 'civil_status', 'residence', 'date_of_inquiry', 'cemetery_type', 'funeral_service'],
            $serviceDetails
        );
        $validSexes = ['Male', 'Female'];
        $validCivilStatuses = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced', 'Other'];
        $validCemeteries = ['Old Cemetery', 'New Cemetery', 'Old Niche', 'Ossuary'];
        $validFuneralServices = ['Funeral Mass', 'Funeral Oration', 'Burial / Sepulture', 'Other'];
        if (!in_array($serviceDetails['sex'] ?? '', $validSexes, true)) $funeralErrors['sex'] = 'Please choose Male or Female.';
        if (!in_array($serviceDetails['civil_status'] ?? '', $validCivilStatuses, true)) $funeralErrors['civil_status'] = 'Please choose a valid civil status.';
        if (!in_array($serviceDetails['cemetery_type'] ?? '', $validCemeteries, true)) $funeralErrors['cemetery_type'] = 'Please choose a valid cemetery type.';
        if (!in_array($serviceDetails['funeral_service'] ?? '', $validFuneralServices, true)) $funeralErrors['funeral_service'] = 'Please choose a valid funeral service.';
        if (($serviceDetails['civil_status'] ?? '') === 'Other' && trim((string) ($serviceDetails['civil_status_other'] ?? '')) === '') $funeralErrors['civil_status_other'] = 'Please specify the civil status.';
        if (($serviceDetails['funeral_service'] ?? '') === 'Other' && trim((string) ($serviceDetails['funeral_service_other'] ?? '')) === '') $funeralErrors['funeral_service_other'] = 'Please specify the funeral service.';
        if (!filter_var($serviceDetails['age'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 150]])) $funeralErrors['age'] = 'Please enter a valid age.';
        foreach (['date_of_death', 'date_of_inquiry'] as $dateField) {
            $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', (string) ($serviceDetails[$dateField] ?? ''), parishTimezone());
            if (!$parsed || $parsed->format('Y-m-d') !== ($serviceDetails[$dateField] ?? '')) $funeralErrors[$dateField] = 'Please enter a valid date.';
        }
        $requiredByCemetery = [
            'Old Cemetery' => ['lot_location', 'kalot_pancheon'],
            'New Cemetery' => ['lot_location', 'kalot_pancheon', 'new_burial_lot'],
            'Old Niche' => ['previous_niche_occupant', 'previous_niche_death_date', 'book', 'page'],
            'Ossuary' => ['ossuary_chamber', 'rental', 'maintenance_fee'],
        ];
        foreach ($requiredByCemetery[$serviceDetails['cemetery_type'] ?? ''] ?? [] as $field) {
            if (trim((string) ($serviceDetails[$field] ?? '')) === '') $funeralErrors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
        }
        if (!empty($funeralErrors)) errorResponse('Funeral reservation validation failed.', 422, $funeralErrors);
    }
    if ($isPrivateMass) {
        $privateErrors = validateRequired(['fullname', 'contact_number', 'purpose', 'location_type', 'location_contact_name', 'location_contact_number'], $serviceDetails);
        $purposes = ['House Blessing', 'Thanksgiving', 'Memorial / Death Anniversary', 'Family Gathering', 'Others'];
        $locations = ['Private Residence/House', 'New House', 'Other Private Location'];
        if (!in_array($serviceDetails['purpose'] ?? '', $purposes, true)) $privateErrors['purpose'] = 'Please choose a valid Private Mass purpose.';
        if (!in_array($serviceDetails['location_type'] ?? '', $locations, true)) $privateErrors['location_type'] = 'Please choose a valid Private Mass location.';
        $purposeRequired = [
            'House Blessing' => ['family_name', 'family_members', 'preferred_time'],
            'Thanksgiving' => ['person_family_name', 'preferred_time'],
            'Memorial / Death Anniversary' => ['deceased_name', 'date_of_death', 'relationship', 'preferred_time'],
            'Family Gathering' => ['person_family_name', 'preferred_time'],
            'Others' => ['custom_purpose'],
        ];
        foreach ($purposeRequired[$serviceDetails['purpose'] ?? ''] ?? [] as $field) {
            if (trim((string) ($serviceDetails[$field] ?? '')) === '') $privateErrors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
        }
        if (isset($serviceDetails['family_members']) && (!filter_var($serviceDetails['family_members'], FILTER_VALIDATE_INT) || (int) $serviceDetails['family_members'] < 1)) {
            $privateErrors['family_members'] = 'Number of family members must be a positive whole number.';
        }
        if (($serviceDetails['purpose'] ?? '') === 'Memorial / Death Anniversary') {
            $deathDate = DateTimeImmutable::createFromFormat('!Y-m-d', (string) ($serviceDetails['date_of_death'] ?? ''), parishTimezone());
            if (!$deathDate || $deathDate->format('Y-m-d') !== ($serviceDetails['date_of_death'] ?? '')) $privateErrors['date_of_death'] = 'Please enter a valid date of death.';
        }
        foreach (['house_block_lot', 'barangay', 'municipality', 'province'] as $field) {
            if (trim((string) ($serviceDetails[$field] ?? '')) === '') $privateErrors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
        }
        if (!empty($privateErrors)) errorResponse('Private Mass reservation validation failed.', 422, $privateErrors);
    }

    $allowedSlots = allowedReservationSlots($data['service_type'], $date);
    if (in_array($data['service_type'], ['Mass Intention', 'Funeral', 'Private Mass'], true)) {
        $allowedSlots = filterPastAppointmentSlots($date, $allowedSlots);
        if ($allowedSlots === []) {
            $scheduleLabel = $isMassIntention ? 'Mass schedule' : ($isFuneral ? 'Funeral schedule' : 'Private Mass schedule');
            errorResponse("This {$scheduleLabel} has already passed. Please select another available schedule.", 422, [
                'reservation_time' => "This {$scheduleLabel} has already passed.",
            ]);
        }
    }
    if (empty($allowedSlots) || !in_array($time, $allowedSlots, true)) {
        errorResponse(
            'Selected date/time is not available for this service.',
            422,
            ['reservation_time' => 'Selected date/time is not available for this service.']
        );
    }

    $lockName = "mass_intention:{$date}:{$time}";
    $lockAcquired = false;
    try {
        $db->beginTransaction();
        if ($isMassIntention) {
            $lockStmt = $db->prepare('SELECT GET_LOCK(?, 10)');
            $lockStmt->execute([$lockName]);
            $lockAcquired = (int) $lockStmt->fetchColumn() === 1;
            if (!$lockAcquired) {
                throw new RuntimeException('The selected Mass schedule is busy. Please try again.');
            }
            $countStmt = $db->prepare(
                "SELECT COUNT(*) FROM reservations
                 WHERE service_type = 'Mass Intention' AND reservation_date = ? AND reservation_time = ?
                   AND status IN ('Under Review', 'Approved')"
            );
            $countStmt->execute([$date, $time]);
            if ((int) $countStmt->fetchColumn() >= 15) {
                throw new DomainException('This Mass schedule is already full (15/15). Please select another available schedule.');
            }
        } else {
            $check = $db->prepare(
                "SELECT id FROM reservations WHERE reservation_date = ? AND reservation_time = ? AND status != 'Rejected' LIMIT 1"
            );
            $check->execute([$date, $time]);
            if ($check->fetch()) {
                throw new DomainException('This date and time slot is already booked.');
            }
        }

        $stmt = $db->prepare(
            'INSERT INTO reservations
             (user_id, service_type, reservation_date, reservation_time, requirements, service_details, intention_name, prayer_intention, payment_amount, payment_method, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            (int) $auth['user_id'], $data['service_type'], $date, $time,
            sanitizeString($data['requirements'] ?? ''),
            ($isFuneral || $isPrivateMass) ? json_encode($serviceDetails, JSON_UNESCAPED_UNICODE) : null,
            $isMassIntention ? sanitizeString($data['intention_name'] ?? '') : null,
            $isMassIntention ? sanitizeString($data['prayer_intention'] ?? '') : null,
            $isMassIntention ? 100.00 : null,
            $isMassIntention ? 'GCash/Bank' : null,
            'Under Review',
        ]);
        $newId = (int) $db->lastInsertId();

        if ($isMassIntention || $isPrivateMass) {
            $requiredFileType = $isMassIntention ? 'payment_receipt' : 'valid_id';
            $validation = validateUploadedFile($_FILES[$requiredFileType]);
            if (!$validation['valid']) throw new DomainException($validation['error']);
            $baseUploadDir = __DIR__ . '/../../uploads';
            $folderResult = createReservationFolder($newId, $baseUploadDir);
            if (!$folderResult['success']) throw new RuntimeException($folderResult['error']);
            $originalFilename = basename($_FILES[$requiredFileType]['name']);
            $storedFilename = generateStoredFilename($originalFilename, $requiredFileType);
            $filePath = getDocumentFilePath($newId, $storedFilename);
            $destination = $baseUploadDir . '/' . $filePath;
            $moveResult = moveUploadedFileSecurely($_FILES[$requiredFileType], $destination);
            if (!$moveResult['success']) throw new RuntimeException($moveResult['error']);
            $documentStmt = $db->prepare(
                'INSERT INTO reservation_documents
                 (reservation_id, document_name, document_type, original_filename, stored_filename, file_path, mime_type, file_size, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $documentStmt->execute([
                $newId, $isMassIntention ? 'Payment Receipt / Proof of Payment' : 'Valid ID', $requiredFileType,
                $originalFilename, $storedFilename, $filePath, $validation['mime_type'],
                (int) $_FILES[$requiredFileType]['size'], 'Pending',
            ]);
        }
        $db->commit();
        if ($lockAcquired) $db->query('SELECT RELEASE_LOCK(' . $db->quote($lockName) . ')');
    } catch (DomainException $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($lockAcquired) $db->query('SELECT RELEASE_LOCK(' . $db->quote($lockName) . ')');
        errorResponse($e->getMessage(), 409);
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($lockAcquired) $db->query('SELECT RELEASE_LOCK(' . $db->quote($lockName) . ')');
        error_log('Reservation creation failed: ' . $e->getMessage());
        errorResponse('Unable to create the reservation at this time. Please try again later.', 500);
    }
    notifyAdmins(
        $db,
        'reservation',
        'New reservation request',
        "{$auth['fullname']} submitted a {$data['service_type']} reservation for {$date}.",
        '/admin/reservations',
        'reservation',
        $newId
    );

    notifyReservationSubmitted(
        $db,
        $newId,
        (int) $auth['user_id'],
        $data['service_type'],
        $date
    );

    // Send SMS notification to user
    $phoneStmt = $db->prepare('SELECT phone FROM users WHERE id = ? LIMIT 1');
    $phoneStmt->execute([(int) $auth['user_id']]);
    $userPhone = (string) ($phoneStmt->fetchColumn() ?: '');
    if ($userPhone) {
        $smsMessage = "Holy Family Parish: Your {$data['service_type']} reservation request for {$date} has been received and is under review.";
        sendSMS($db, (int) $auth['user_id'], $userPhone, $smsMessage);
    }

    successResponse(['id' => $newId], 'Reservation submitted successfully.', 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    if (!$isAdmin) {
        errorResponse('Admin access required.', 403);
    }
    $data = getJsonInput();
    $id = (int) ($data['id'] ?? 0);
    $status = $data['status'] ?? '';
    $remarks = sanitizeString($data['remarks'] ?? '');

    if ($id <= 0 || !in_array($status, allowedStatuses(), true)) {
        errorResponse('Invalid reservation update.', 422);
    }
    if ($status === 'Rejected' && trim((string) ($data['remarks'] ?? '')) === '') {
        errorResponse('A rejection reason is required.', 422, ['remarks' => 'Please provide a rejection reason.']);
    }

    $stmt = $db->prepare('SELECT id, service_type, status, reservation_date, reservation_time, intention_name FROM reservations WHERE id = ?');
    $stmt->execute([$id]);
    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$reservation) {
        errorResponse('Reservation not found.', 404);
    }

    $previousStatus = (string) $reservation['status'];
    $statusChanged = $status !== $previousStatus;

    // Prevent approval if required documents are not verified
    if ($status === 'Approved') {
        if (!areRequiredDocumentsVerified($db, $id, $reservation['service_type'])) {
            $summary = getReservationDocumentSummary($db, $id, $reservation['service_type']);
            errorResponse(
                'All required documents must be verified before approving this reservation. ' .
                "Verified: {$summary['verified']}/{$summary['total_required']}, " .
                "Rejected: {$summary['rejected']}, " .
                "Missing: {$summary['missing']}.",
                422
            );
        }
    }

    $upd = $db->prepare('UPDATE reservations SET status = ?, remarks = ? WHERE id = ?');
    $upd->execute([$status, $remarks ?: null, $id]);

    if ($status === 'Approved' && $reservation['service_type'] === 'Funeral') {
        createFuneralRecordIfMissing($db, $id);
    }

    // A decision notification is created only after a real status transition.
    if ($statusChanged) {
        notifyReservationStatusChange($db, $id, $status);
    }

    // Send SMS only when status actually changes
    if ($statusChanged) {
        $smsStmt = $db->prepare('SELECT user_id, phone FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.id = ?');
        $smsStmt->execute([$id]);
        $reservationUser = $smsStmt->fetch(PDO::FETCH_ASSOC);

        if ($reservationUser && $reservationUser['phone']) {
            $serviceLabel = (string) $reservation['service_type'];
            $resDate = (string) $reservation['reservation_date'];
            $resTime = (string) $reservation['reservation_time'];

            if ($serviceLabel === 'Mass Intention') {
                // Mass Intention uses its own dedicated wording, not the generic reservation message.
                $massIntentionLabel = (string) ($reservation['intention_name'] ?: 'Mass Intention');
                $smsMessages = [
                    'Approved' => "Holy Family Parish: Your Mass Intention reservation has been approved for {$resDate} at {$resTime}. Reservation ID: {$id}. Thank you.",
                    'Rejected' => "Holy Family Parish: Your Mass Intention reservation has been rejected." . ($remarks !== '' ? " Reason: {$remarks}." : '') . " Reservation ID: {$id}.",
                ];
            } else {
                $smsMessages = [
                    'Approved' => "Holy Family Parish: Your {$serviceLabel} reservation has been approved for {$resDate} at {$resTime}. Reservation ID: {$id}. Please visit the Parish Office to process your payments. Kindly bring sufficient cash for any applicable fees. Thank you.",
                    'Rejected' => "Holy Family Parish: Your {$serviceLabel} reservation has been rejected." . ($remarks !== '' ? " Reason: {$remarks}." : '') . " Reservation ID: {$id}.",
                ];
            }

            if (isset($smsMessages[$status])) {
                sendSMS($db, (int) $reservationUser['user_id'], $reservationUser['phone'], $smsMessages[$status]);
            }
        }
    }

    successResponse(null, "Reservation $status.");
}

errorResponse('Method not allowed.', 405);

function createFuneralRecordIfMissing(PDO $db, int $reservationId): void
{
    $existing = $db->prepare('SELECT id FROM parish_records WHERE reservation_id = ? LIMIT 1');
    $existing->execute([$reservationId]);
    if ($existing->fetchColumn()) return;

    $stmt = $db->prepare('SELECT user_id, service_details FROM reservations WHERE id = ? AND service_type = \'Funeral\' LIMIT 1');
    $stmt->execute([$reservationId]);
    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$reservation) return;

    $details = json_decode((string) ($reservation['service_details'] ?? ''), true);
    $recordDetails = is_array($details) ? json_encode($details, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) : (string) ($reservation['service_details'] ?? '');
    $insert = $db->prepare('INSERT INTO parish_records (user_id, reservation_id, service_type, details) VALUES (?, ?, ?, ?)');
    $insert->execute([(int) $reservation['user_id'], $reservationId, 'Funeral', $recordDetails ?: 'Funeral reservation details']);
}
