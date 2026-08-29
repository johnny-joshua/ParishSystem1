<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/documents.php';
require_once __DIR__ . '/../../utils/upload.php';

$auth = requireAuth();
$db = getDB();
$isAdmin = ($auth['role'] ?? '') === 'admin';
$userId = (int) $auth['user_id'];

// Base upload directory
$baseUploadDir = __DIR__ . '/../../uploads';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

$documentId = (int) ($_GET['id'] ?? 0);

if ($documentId <= 0) {
    errorResponse('Document ID is required.', 422);
}

// Get document with reservation info
$stmt = $db->prepare(
    'SELECT rd.*, r.user_id as reservation_user_id 
     FROM reservation_documents rd 
     JOIN reservations r ON rd.reservation_id = r.id 
     WHERE rd.id = ?'
);
$stmt->execute([$documentId]);
$document = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$document) {
    errorResponse('Document not found.', 404);
}

// Verify ownership or admin access
if (!$isAdmin && (int) $document['reservation_user_id'] !== $userId) {
    errorResponse('You do not have permission to download this document.', 403);
}

// Get absolute file path
$absolutePath = getAbsoluteFilePath($document['file_path'], $baseUploadDir);

if ($absolutePath === null) {
    errorResponse('File not found on server.', 404);
}

// Verify file exists
if (!file_exists($absolutePath)) {
    errorResponse('File not found on server.', 404);
}

// Verify MIME type is allowed
if (!isAllowedMimeType($document['mime_type'])) {
    errorResponse('Invalid file type.', 400);
}

// Clear output buffer
while (ob_get_level() > 0) {
    ob_end_clean();
}

// Set headers for file download or inline preview
$safeFilename = preg_replace('/[^\w.\- ]/', '_', basename($document['original_filename']));
$disposition = (($_GET['disposition'] ?? 'attachment') === 'inline') ? 'inline' : 'attachment';
header_remove('Content-Type');
header('Content-Type: ' . $document['mime_type']);
header('Content-Disposition: ' . $disposition . '; filename="' . $safeFilename . '"');
header('Content-Length: ' . filesize($absolutePath));
header('Cache-Control: private, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Stream file to output
$handle = fopen($absolutePath, 'rb');
if ($handle === false) {
    errorResponse('Failed to open file.', 500);
}

while (!feof($handle)) {
    echo fread($handle, 8192);
    flush();
}

fclose($handle);
exit;
