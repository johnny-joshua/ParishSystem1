<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../utils/documents.php';
require_once __DIR__ . '/../../utils/upload.php';
require_once __DIR__ . '/../../utils/notifications.php';
require_once __DIR__ . '/../../utils/sms.php';

$auth = requireAuth();
$db = getDB();
$isAdmin = ($auth['role'] ?? '') === 'admin';
$userId = (int) $auth['user_id'];

// Base upload directory
$baseUploadDir = __DIR__ . '/../../uploads';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Upload a document for a reservation
    $reservationId = (int) ($_POST['reservation_id'] ?? 0);
    $documentType = (string) ($_POST['document_type'] ?? '');
    
    if ($reservationId <= 0) {
        errorResponse('Reservation ID is required.', 422);
    }
    
    if ($documentType === '') {
        errorResponse('Document type is required.', 422);
    }
    
    if (!isset($_FILES['document']) || !is_uploaded_file($_FILES['document']['tmp_name'])) {
        errorResponse('No file uploaded.', 422);
    }
    
    // Verify reservation ownership or admin access
    $checkStmt = $db->prepare('SELECT id, user_id, service_type FROM reservations WHERE id = ?');
    $checkStmt->execute([$reservationId]);
    $reservation = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$reservation) {
        errorResponse('Reservation not found.', 404);
    }
    
    if (!$isAdmin && (int) $reservation['user_id'] !== $userId) {
        errorResponse('You do not have permission to upload documents for this reservation.', 403);
    }
    
    // Validate document type exists for this service
    $serviceType = $reservation['service_type'];
    if (!documentTypeExists($serviceType, $documentType)) {
        errorResponse('Invalid document type for this service.', 422);
    }
    
    // Validate uploaded file
    $validation = validateUploadedFile($_FILES['document']);
    if (!$validation['valid']) {
        errorResponse($validation['error'], 422);
    }
    
    $mimeType = $validation['mime_type'];
    $fileSize = (int) $_FILES['document']['size'];
    $originalFilename = basename($_FILES['document']['name']);

    // Check for an existing document of the same type (one per reservation)
    $existingStmt = $db->prepare(
        'SELECT id, status, file_path FROM reservation_documents
         WHERE reservation_id = ? AND document_type = ?
         LIMIT 1'
    );
    $existingStmt->execute([$reservationId, $documentType]);
    $existingDoc = $existingStmt->fetch(PDO::FETCH_ASSOC);

    if ($existingDoc && $existingDoc['status'] !== 'Rejected') {
        errorResponse('A document of this type has already been uploaded.', 422);
    }
    
    // Start database transaction
    try {
        $db->beginTransaction();

        if ($existingDoc) {
            $deleteResult = deleteUploadedFile($existingDoc['file_path'], $baseUploadDir);
            if (!$deleteResult['success']) {
                throw new Exception($deleteResult['error']);
            }

            $removeStmt = $db->prepare('DELETE FROM reservation_documents WHERE id = ?');
            $removeStmt->execute([(int) $existingDoc['id']]);
        }
        
        // Create reservation folder
        $folderResult = createReservationFolder($reservationId, $baseUploadDir);
        if (!$folderResult['success']) {
            throw new Exception($folderResult['error']);
        }
        
        // Generate secure filename
        $storedFilename = generateStoredFilename($originalFilename, $documentType);
        $filePath = getDocumentFilePath($reservationId, $storedFilename);
        $fullDestinationPath = $baseUploadDir . '/' . $filePath;
        
        // Move uploaded file
        $moveResult = moveUploadedFileSecurely($_FILES['document'], $fullDestinationPath);
        if (!$moveResult['success']) {
            throw new Exception($moveResult['error']);
        }
        
        // Get document display name
        $documentName = getDocumentTypeName($serviceType, $documentType);
        
        // Insert document record
        $insertStmt = $db->prepare(
            'INSERT INTO reservation_documents 
             (reservation_id, document_name, document_type, original_filename, stored_filename, file_path, mime_type, file_size, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insertStmt->execute([
            $reservationId,
            $documentName,
            $documentType,
            $originalFilename,
            $storedFilename,
            $filePath,
            $mimeType,
            $fileSize,
            'Pending',
        ]);
        
        $documentId = (int) $db->lastInsertId();
        
        $db->commit();
        
        successResponse([
            'id' => $documentId,
            'document_name' => $documentName,
            'document_type' => $documentType,
            'original_filename' => $originalFilename,
            'file_size' => $fileSize,
            'status' => 'Pending',
        ], 'Document uploaded successfully.', 201);
        
    } catch (Exception $e) {
        $db->rollBack();
        
        // Clean up uploaded file if it exists
        if (isset($fullDestinationPath) && file_exists($fullDestinationPath)) {
            @unlink($fullDestinationPath);
        }
        
        errorResponse('Failed to upload document: ' . $e->getMessage(), 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    // Admin only: Update document status (verify/reject)
    if (!$isAdmin) {
        errorResponse('Admin access required.', 403);
    }
    
    $data = getJsonInput();
    $documentId = (int) ($data['document_id'] ?? 0);
    $status = (string) ($data['status'] ?? '');
    $remarks = trim((string) ($data['remarks'] ?? ''));
    
    if ($documentId <= 0) {
        errorResponse('Document ID is required.', 422);
    }
    
    if (!isValidDocumentStatus($status)) {
        errorResponse('Invalid document status.', 422);
    }
    
    // Rejected documents require remarks
    if ($status === 'Rejected' && $remarks === '') {
        errorResponse('Remarks are required when rejecting a document.', 422);
    }
    
    // Get document with reservation info
    $stmt = $db->prepare(
        'SELECT rd.*, r.user_id as reservation_user_id, r.service_type, u.phone
         FROM reservation_documents rd 
         JOIN reservations r ON rd.reservation_id = r.id
         JOIN users u ON r.user_id = u.id
         WHERE rd.id = ?'
    );
    $stmt->execute([$documentId]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$document) {
        errorResponse('Document not found.', 404);
    }

    $previousDocStatus = (string) ($document['status'] ?? '');
    $statusChanged = $status !== $previousDocStatus;
    
    // Update document status
    try {
        $db->beginTransaction();
        
        $updateStmt = $db->prepare(
            'UPDATE reservation_documents SET status = ?, remarks = ? WHERE id = ?'
        );
        $updateStmt->execute([$status, $remarks ?: null, $documentId]);
        
        $db->commit();
        
        $docUserId = (int) $document['reservation_user_id'];
        
        if ($status === 'Verified') {
            $smsMessage = "Your document ({$document['document_name']}) has been verified.";
        } else {
            $smsMessage = "Your document ({$document['document_name']}) was rejected. Please re-upload. Remarks: {$remarks}";
        }

        // SMS only when document status actually changes
        if ($statusChanged) {
            $userPhone = (string) ($document['phone'] ?? '');
            if ($userPhone !== '') {
                sendSMS($db, $docUserId, $userPhone, $smsMessage);
            }
        }
        
        successResponse(null, "Document {$status}.");
        
    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Failed to update document: ' . $e->getMessage(), 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List documents for a reservation
    $reservationId = (int) ($_GET['reservation_id'] ?? 0);
    
    if ($reservationId <= 0) {
        errorResponse('Reservation ID is required.', 422);
    }
    
    // Verify reservation ownership or admin access
    $checkStmt = $db->prepare('SELECT id, user_id, service_type FROM reservations WHERE id = ?');
    $checkStmt->execute([$reservationId]);
    $reservation = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$reservation) {
        errorResponse('Reservation not found.', 404);
    }
    
    if (!$isAdmin && (int) $reservation['user_id'] !== $userId) {
        errorResponse('You do not have permission to view documents for this reservation.', 403);
    }
    
    // Get documents
    $stmt = $db->prepare(
        'SELECT id, document_name, document_type, original_filename, mime_type, file_size, status, remarks, uploaded_at
         FROM reservation_documents 
         WHERE reservation_id = ? 
         ORDER BY uploaded_at DESC'
    );
    $stmt->execute([$reservationId]);
    $documents = $stmt->fetchAll();

    $summary = getReservationDocumentSummary($db, $reservationId, $reservation['service_type']);
    
    successResponse([
        'documents' => $documents,
        'total' => count($documents),
        'document_summary' => $summary,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Delete a document
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
        errorResponse('You do not have permission to delete this document.', 403);
    }

    if (!$isAdmin && $document['status'] !== 'Rejected') {
        errorResponse('Only rejected documents can be removed for replacement.', 403);
    }
    
    // Start database transaction
    try {
        $db->beginTransaction();
        
        // Delete physical file
        $deleteResult = deleteUploadedFile($document['file_path'], $baseUploadDir);
        if (!$deleteResult['success']) {
            throw new Exception($deleteResult['error']);
        }
        
        // Delete database record
        $deleteStmt = $db->prepare('DELETE FROM reservation_documents WHERE id = ?');
        $deleteStmt->execute([$documentId]);
        
        // Clean up empty folder
        cleanupEmptyReservationFolder((int) $document['reservation_id'], $baseUploadDir);
        
        $db->commit();
        
        successResponse(null, 'Document deleted successfully.');
        
    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Failed to delete document: ' . $e->getMessage(), 500);
    }
}

errorResponse('Method not allowed.', 405);
