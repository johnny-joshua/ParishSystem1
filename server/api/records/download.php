<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/documents.php';
require_once __DIR__ . '/../../utils/upload.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

$userId = (int) ($_GET['user_id'] ?? 0);
if ($userId <= 0) {
    errorResponse('Parishioner ID is required.', 422);
}

$db = getDB();
$baseUploadDir = __DIR__ . '/../../uploads';

$userStmt = $db->prepare('SELECT fullname FROM users WHERE id = ? AND role = \'user\' LIMIT 1');
$userStmt->execute([$userId]);
$user = $userStmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    errorResponse('Parishioner record not found.', 404);
}

$docStmt = $db->prepare(
    'SELECT rd.original_filename, rd.file_path, rd.mime_type, rd.document_name, r.service_type
     FROM reservation_documents rd
     INNER JOIN reservations r ON rd.reservation_id = r.id
     WHERE r.user_id = ?
     ORDER BY rd.uploaded_at ASC'
);
$docStmt->execute([$userId]);
$documents = $docStmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($documents)) {
    errorResponse('No uploaded files found for this parishioner.', 404);
}

if (!class_exists('ZipArchive')) {
    errorResponse('ZIP extension is not available on this server.', 500);
}

$safeName = preg_replace('/[^\w.\- ]/', '_', $user['fullname']);
$zipFilename = $safeName . '_records_' . date('Y-m-d') . '.zip';
$tempZip = tempnam(sys_get_temp_dir(), 'parish_records_');

$zip = new ZipArchive();
if ($zip->open($tempZip, ZipArchive::OVERWRITE) !== true) {
    @unlink($tempZip);
    errorResponse('Failed to create download archive.', 500);
}

$usedNames = [];
foreach ($documents as $index => $document) {
    $absolutePath = getAbsoluteFilePath($document['file_path'], $baseUploadDir);
    if ($absolutePath === null || !file_exists($absolutePath)) {
        continue;
    }

    if (!isAllowedMimeType($document['mime_type'])) {
        continue;
    }

    $entryName = basename($document['original_filename']);
    if (isset($usedNames[$entryName])) {
        $usedNames[$entryName]++;
        $extension = pathinfo($entryName, PATHINFO_EXTENSION);
        $base = pathinfo($entryName, PATHINFO_FILENAME);
        $entryName = $base . '_' . $usedNames[$entryName] . ($extension !== '' ? '.' . $extension : '');
    } else {
        $usedNames[$entryName] = 1;
    }

    $folder = preg_replace('/[^\w.\- ]/', '_', $document['service_type']);
    $zip->addFile($absolutePath, $folder . '/' . $entryName);
}

if ($zip->numFiles === 0) {
    $zip->close();
    @unlink($tempZip);
    errorResponse('No accessible files found for this parishioner.', 404);
}

$zip->close();

while (ob_get_level() > 0) {
    ob_end_clean();
}

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
header('Content-Length: ' . filesize($tempZip));
header('Cache-Control: private, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

readfile($tempZip);
@unlink($tempZip);
exit;
