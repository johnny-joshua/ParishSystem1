<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/upload.php';
require_once __DIR__ . '/../../middleware/auth.php';

requireAdmin();

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str(file_get_contents('php://input'), $deleteParams);
    $deleteReservationId = (int) ($_GET['reservation_id'] ?? $deleteParams['reservation_id'] ?? 0);
    $deleteParishRecordId = (int) ($_GET['parish_record_id'] ?? $deleteParams['parish_record_id'] ?? 0);

    if ($deleteReservationId > 0) {
        deleteReservationRecord($db, $deleteReservationId);
    }

    if ($deleteParishRecordId > 0) {
        deleteUnlinkedParishRecord($db, $deleteParishRecordId);
    }

    errorResponse('A valid reservation_id or parish_record_id is required.', 400);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

$userId = (int) ($_GET['user_id'] ?? 0);
$parishRecordId = (int) ($_GET['parish_record_id'] ?? 0);
$reservationId = (int) ($_GET['reservation_id'] ?? 0);

if ($parishRecordId > 0) {
    successResponse(getUnlinkedRecordDetail($db, $parishRecordId));
}

if ($reservationId > 0) {
    successResponse(getReservationRecordDetail($db, $reservationId));
}

if ($userId > 0) {
    successResponse(getParishionerRecordDetail($db, $userId));
}

$q = trim($_GET['q'] ?? '');
$service = trim($_GET['service'] ?? '');
$status = trim($_GET['status'] ?? '');
$from = $_GET['from'] ?? '';
$to = $_GET['to'] ?? '';

successResponse(['records' => getReservationRecordList($db, $q, $service, $status, $from, $to)]);

function getReservationRecordList(PDO $db, string $q, string $service, string $status, string $from, string $to): array
{
    $sql = 'SELECT r.id AS reservation_id, r.user_id, r.service_type, r.reservation_date,
                   r.reservation_time, r.status, r.created_at,
                   u.fullname, u.email, u.phone, u.address, r.requirements, r.service_details
            FROM reservations r
            INNER JOIN users u ON r.user_id = u.id
            WHERE 1 = 1';
    $params = [];

    if ($q !== '') {
        $sql .= ' AND (u.fullname LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.address LIKE ?
            OR r.requirements LIKE ? OR r.service_type LIKE ? OR CAST(r.id AS CHAR) LIKE ?)';
        $like = '%' . $q . '%';
        $params = array_merge($params, [$like, $like, $like, $like, $like, $like, $like]);
    }
    if ($service !== '') {
        $sql .= ' AND r.service_type = ?';
        $params[] = $service;
    }
    if ($status !== '') {
        $sql .= ' AND r.status = ?';
        $params[] = $status;
    }
    if ($from !== '') {
        $sql .= ' AND DATE(r.created_at) >= ?';
        $params[] = $from;
    }
    if ($to !== '') {
        $sql .= ' AND DATE(r.created_at) <= ?';
        $params[] = $to;
    }

    $sql .= ' ORDER BY r.created_at DESC, r.id DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $records = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $records[] = [
            'reservation_id' => (int) $row['reservation_id'],
            'user_id' => (int) $row['user_id'],
            'fullname' => reservationFolderName($row),
            'parishioner_name' => $row['fullname'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'address' => $row['address'],
            'service_type' => $row['service_type'],
            'status' => $row['status'],
            'record_date' => $row['reservation_date'],
            'record_time' => $row['reservation_time'],
            'created_at' => $row['created_at'],
            'latest_activity_at' => $row['created_at'],
            'is_unlinked' => false,
        ];
    }

    return array_merge($records, getUnlinkedParishRecords($db, $q, $service, $status, $from, $to));
}

function getReservationRecordDetail(PDO $db, int $reservationId): array
{
    $stmt = $db->prepare(
        'SELECT r.*, u.id AS parishioner_id, u.fullname, u.email, u.phone, u.address,
                u.created_at AS member_since
         FROM reservations r
         INNER JOIN users u ON r.user_id = u.id
         WHERE r.id = ?
         LIMIT 1'
    );
    $stmt->execute([$reservationId]);
    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$reservation) {
        errorResponse('Reservation record not found.', 404);
    }

    $docStmt = $db->prepare(
        'SELECT rd.*, r.service_type, r.reservation_date
         FROM reservation_documents rd
         INNER JOIN reservations r ON rd.reservation_id = r.id
         WHERE rd.reservation_id = ?
         ORDER BY rd.uploaded_at DESC'
    );
    $docStmt->execute([$reservationId]);
    $documents = $docStmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'parishioner' => [
            'id' => (int) $reservation['parishioner_id'],
            'fullname' => reservationFolderName($reservation),
            'account_name' => $reservation['fullname'],
            'email' => $reservation['email'],
            'phone' => $reservation['phone'],
            'address' => $reservation['address'],
            'member_since' => $reservation['member_since'],
        ],
        'reservations' => [[
            'id' => (int) $reservation['id'],
            'service_type' => $reservation['service_type'],
            'reservation_date' => $reservation['reservation_date'],
            'reservation_time' => $reservation['reservation_time'],
            'requirements' => $reservation['requirements'],
            'service_details' => $reservation['service_details'],
            'status' => $reservation['status'],
            'remarks' => $reservation['remarks'],
            'created_at' => $reservation['created_at'],
        ]],
        'appointments' => [],
        'parish_records' => [],
        'documents' => formatDocumentRows($documents),
        'file_count' => count($documents),
    ];
}

function reservationFolderName(array $reservation): string
{
    if (($reservation['service_type'] ?? '') === 'Funeral' && !empty($reservation['service_details'])) {
        $details = json_decode((string) $reservation['service_details'], true);
        if (is_array($details) && !empty($details['deceased_name'])) return (string) $details['deceased_name'];
    }
    $details = (string) ($reservation['requirements'] ?? '');
    if (($reservation['service_type'] ?? '') === 'Marriage') {
        $bride = extractRequirementValue($details, 'Bride Name') ?: 'Bride';
        $groom = extractRequirementValue($details, 'Groom Name') ?: 'Groom';
        return $bride . ' & ' . $groom;
    }

    $nameKeys = [
        'Baptism' => ['Child Name', 'Parents / Guardians'],
        'Funeral' => ['Deceased Name', 'Family Contact Person'],
        'Mass Intention' => ['Intention Name / Requested For'],
        'Private Mass' => ['Event / Occasion Name'],
    ];
    foreach ($nameKeys[$reservation['service_type'] ?? ''] ?? [] as $key) {
        $value = extractRequirementValue($details, $key);
        if ($value) return $value;
    }

    return (string) ($reservation['fullname'] ?? 'Parishioner');
}

function extractRequirementValue(string $requirements, string $label): ?string
{
    $pattern = '/^' . preg_quote($label, '/') . '\\s*:\\s*(.+)$/mi';
    if (preg_match($pattern, $requirements, $matches)) {
        $value = trim($matches[1]);
        return $value !== '' ? $value : null;
    }
    return null;
}

function getParishionerRecordList(PDO $db, string $q, string $service, string $status, string $from, string $to): array
{
    $sql = "
        SELECT
            u.id AS user_id,
            u.fullname,
            u.email,
            u.phone,
            u.address,
            u.created_at AS member_since,
            (
                SELECT COUNT(*)
                FROM reservation_documents rd
                INNER JOIN reservations r ON rd.reservation_id = r.id
                WHERE r.user_id = u.id
            ) AS file_count,
            (
                SELECT COUNT(*)
                FROM reservations r2
                WHERE r2.user_id = u.id
            ) AS reservation_count,
            (
                SELECT COUNT(*)
                FROM appointments a
                WHERE a.user_id = u.id
            ) AS appointment_count,
            (
                SELECT COUNT(*)
                FROM parish_records pr
                WHERE pr.user_id = u.id
            ) AS parish_record_count,
            lr.service_type AS latest_service_type,
            lr.status AS latest_status,
            lr.reservation_date AS latest_reservation_date,
            lr.reservation_time AS latest_reservation_time,
            lr.created_at AS latest_activity_at
        FROM users u
        LEFT JOIN (
            SELECT r.*
            FROM reservations r
            INNER JOIN (
                SELECT user_id, MAX(created_at) AS max_created
                FROM reservations
                GROUP BY user_id
            ) latest ON r.user_id = latest.user_id AND r.created_at = latest.max_created
        ) lr ON lr.user_id = u.id
        WHERE u.role = 'user'
          AND (
              EXISTS (SELECT 1 FROM reservations r WHERE r.user_id = u.id)
              OR EXISTS (SELECT 1 FROM appointments a WHERE a.user_id = u.id)
              OR EXISTS (SELECT 1 FROM parish_records pr WHERE pr.user_id = u.id)
          )
    ";

    $params = [];

    if ($q !== '') {
        $sql .= ' AND (u.fullname LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.address LIKE ?)';
        $like = '%' . $q . '%';
        $params = array_merge($params, [$like, $like, $like, $like]);
    }

    if ($service !== '') {
        $sql .= ' AND EXISTS (
            SELECT 1 FROM reservations rs
            WHERE rs.user_id = u.id AND rs.service_type LIKE ?
        )';
        $params[] = '%' . $service . '%';
    }

    if ($status !== '') {
        $sql .= ' AND EXISTS (
            SELECT 1 FROM reservations rs
            WHERE rs.user_id = u.id AND rs.status = ?
        )';
        $params[] = $status;
    }

    if ($from !== '') {
        $sql .= ' AND EXISTS (
            SELECT 1 FROM reservations rs
            WHERE rs.user_id = u.id AND DATE(rs.created_at) >= ?
        )';
        $params[] = $from;
    }

    if ($to !== '') {
        $sql .= ' AND EXISTS (
            SELECT 1 FROM reservations rs
            WHERE rs.user_id = u.id AND DATE(rs.created_at) <= ?
        )';
        $params[] = $to;
    }

    $sql .= ' ORDER BY COALESCE(lr.created_at, u.created_at) DESC, u.fullname ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $records = [];
    foreach ($rows as $row) {
        $serviceTypes = getUserServiceTypes($db, (int) $row['user_id']);
        $records[] = [
            'user_id' => (int) $row['user_id'],
            'fullname' => $row['fullname'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'address' => $row['address'],
            'member_since' => $row['member_since'],
            'file_count' => (int) $row['file_count'],
            'reservation_count' => (int) $row['reservation_count'],
            'appointment_count' => (int) $row['appointment_count'],
            'parish_record_count' => (int) $row['parish_record_count'],
            'service_type' => $row['latest_service_type'] ?: ($serviceTypes[0] ?? 'General'),
            'service_types' => $serviceTypes,
            'status' => $row['latest_status'] ?: '—',
            'record_date' => $row['latest_reservation_date'],
            'record_time' => $row['latest_reservation_time'],
            'latest_activity_at' => $row['latest_activity_at'] ?: $row['member_since'],
        ];
    }

    $unlinked = getUnlinkedParishRecords($db, $q, $service, $status, $from, $to);
    return array_merge($records, $unlinked);
}

function getUserServiceTypes(PDO $db, int $userId): array
{
    $stmt = $db->prepare(
        'SELECT DISTINCT service_type
         FROM reservations
         WHERE user_id = ?
         ORDER BY service_type ASC'
    );
    $stmt->execute([$userId]);
    return array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'service_type');
}

function getUnlinkedParishRecords(PDO $db, string $q, string $service, string $status, string $from, string $to): array
{
    if ($service !== '' || $status !== '') {
        return [];
    }

    $sql = 'SELECT pr.* FROM parish_records pr WHERE pr.user_id IS NULL';
    $params = [];

    if ($q !== '') {
        $sql .= ' AND (pr.details LIKE ? OR pr.service_type LIKE ?)';
        $like = '%' . $q . '%';
        $params[] = $like;
        $params[] = $like;
    }

    if ($from !== '') {
        $sql .= ' AND DATE(pr.created_at) >= ?';
        $params[] = $from;
    }

    if ($to !== '') {
        $sql .= ' AND DATE(pr.created_at) <= ?';
        $params[] = $to;
    }

    $sql .= ' ORDER BY pr.created_at DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $records = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $records[] = [
            'user_id' => null,
            'parish_record_id' => (int) $row['id'],
            'fullname' => extractNameFromDetails($row['details']) ?: 'Unlinked Record',
            'email' => null,
            'phone' => null,
            'address' => null,
            'member_since' => $row['created_at'],
            'file_count' => 0,
            'reservation_count' => 0,
            'appointment_count' => 0,
            'parish_record_count' => 1,
            'service_type' => $row['service_type'],
            'service_types' => [$row['service_type']],
            'status' => 'Archived',
            'record_date' => null,
            'record_time' => null,
            'latest_activity_at' => $row['created_at'],
            'is_unlinked' => true,
        ];
    }

    return $records;
}

function getUnlinkedRecordDetail(PDO $db, int $parishRecordId): array
{
    $stmt = $db->prepare(
        'SELECT id, service_type, details, created_at
         FROM parish_records
         WHERE id = ? AND user_id IS NULL
         LIMIT 1'
    );
    $stmt->execute([$parishRecordId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        errorResponse('Archive record not found.', 404);
    }

    $displayName = extractNameFromDetails($record['details']) ?: 'Unlinked Record';

    return [
        'parishioner' => [
            'id' => null,
            'fullname' => $displayName,
            'email' => null,
            'phone' => null,
            'address' => null,
            'member_since' => $record['created_at'],
        ],
        'reservations' => [],
        'appointments' => [],
        'parish_records' => [$record],
        'documents' => [],
        'file_count' => 0,
        'is_unlinked' => true,
    ];
}

function getParishionerRecordDetail(PDO $db, int $userId): array
{
    $userStmt = $db->prepare(
        'SELECT id, fullname, email, phone, address, created_at
         FROM users
         WHERE id = ? AND role = \'user\'
         LIMIT 1'
    );
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        errorResponse('Parishioner record not found.', 404);
    }

    $reservationsStmt = $db->prepare(
        'SELECT id, service_type, reservation_date, reservation_time, requirements, service_details, status, remarks, created_at
         FROM reservations
         WHERE user_id = ?
         ORDER BY created_at DESC'
    );
    $reservationsStmt->execute([$userId]);
    $reservations = $reservationsStmt->fetchAll(PDO::FETCH_ASSOC);

    $documents = [];
    if (!empty($reservations)) {
        $reservationIds = array_column($reservations, 'id');
        $placeholders = implode(',', array_fill(0, count($reservationIds), '?'));
        $docStmt = $db->prepare(
            "SELECT rd.*, r.service_type, r.reservation_date
             FROM reservation_documents rd
             INNER JOIN reservations r ON rd.reservation_id = r.id
             WHERE rd.reservation_id IN ($placeholders)
             ORDER BY rd.uploaded_at DESC"
        );
        $docStmt->execute($reservationIds);
        $documents = formatDocumentRows($docStmt->fetchAll(PDO::FETCH_ASSOC));
    }

    $appointmentsStmt = $db->prepare(
        'SELECT id, appointment_date, appointment_time, purpose, remarks, status, created_at, updated_at
         FROM appointments
         WHERE user_id = ?
         ORDER BY created_at DESC'
    );
    $appointmentsStmt->execute([$userId]);
    $appointments = $appointmentsStmt->fetchAll(PDO::FETCH_ASSOC);

    $parishRecordsStmt = $db->prepare(
        'SELECT id, service_type, details, created_at
         FROM parish_records
         WHERE user_id = ?
         ORDER BY created_at DESC'
    );
    $parishRecordsStmt->execute([$userId]);
    $parishRecords = $parishRecordsStmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'parishioner' => [
            'id' => (int) $user['id'],
            'fullname' => $user['fullname'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'address' => $user['address'],
            'member_since' => $user['created_at'],
        ],
        'reservations' => $reservations,
        'appointments' => $appointments,
        'parish_records' => $parishRecords,
        'documents' => $documents,
        'file_count' => count($documents),
    ];
}

function formatDocumentRows(array $documents): array
{
    return array_map(static function (array $doc): array {
        return [
            'id' => (int) $doc['id'],
            'reservation_id' => (int) $doc['reservation_id'],
            'document_name' => $doc['document_name'],
            'document_type' => $doc['document_type'],
            'original_filename' => $doc['original_filename'],
            'stored_filename' => $doc['stored_filename'],
            'file_path' => $doc['file_path'],
            'mime_type' => (string) ($doc['mime_type'] ?? ''),
            'file_size' => (int) ($doc['file_size'] ?? 0),
            'status' => $doc['status'],
            'remarks' => $doc['remarks'] ?? null,
            'uploaded_at' => $doc['uploaded_at'],
            'service_type' => $doc['service_type'] ?? null,
            'reservation_date' => $doc['reservation_date'] ?? null,
        ];
    }, $documents);
}

function extractNameFromDetails(string $details): ?string
{
    if (preg_match('/(?:name|parishioner|full\s*name)\s*[:\-]\s*(.+)/i', $details, $matches)) {
        $name = trim($matches[1]);
        $name = preg_split('/[\r\n,|]/', $name)[0];
        return trim($name) !== '' ? trim($name) : null;
    }

    return null;
}

function deleteReservationRecord(PDO $db, int $reservationId): void
{
    $stmt = $db->prepare('SELECT id FROM reservations WHERE id = ? LIMIT 1');
    $stmt->execute([$reservationId]);
    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        errorResponse('Parishioner record not found.', 404);
    }

    $docStmt = $db->prepare('SELECT file_path FROM reservation_documents WHERE reservation_id = ?');
    $docStmt->execute([$reservationId]);
    $filePaths = array_column($docStmt->fetchAll(PDO::FETCH_ASSOC), 'file_path');

    try {
        $db->beginTransaction();
        // reservation_documents rows cascade-delete via FK constraint
        $db->prepare('DELETE FROM reservations WHERE id = ?')->execute([$reservationId]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        errorResponse('Unable to delete record. Please try again.', 500);
    }

    $baseUploadDir = realpath(__DIR__ . '/../../uploads');
    if ($baseUploadDir !== false) {
        foreach ($filePaths as $filePath) {
            deleteUploadedFile($filePath, $baseUploadDir);
        }
        $folder = $baseUploadDir . '/' . generateReservationFolder($reservationId);
        if (is_dir($folder) && count(scandir($folder)) === 2) {
            @rmdir($folder);
        }
    }

    successResponse(null, 'Record deleted successfully.');
}

function deleteUnlinkedParishRecord(PDO $db, int $parishRecordId): void
{
    $stmt = $db->prepare('SELECT id FROM parish_records WHERE id = ? AND user_id IS NULL LIMIT 1');
    $stmt->execute([$parishRecordId]);
    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        errorResponse('Parishioner record not found.', 404);
    }

    $db->prepare('DELETE FROM parish_records WHERE id = ?')->execute([$parishRecordId]);
    successResponse(null, 'Record deleted successfully.');
}
