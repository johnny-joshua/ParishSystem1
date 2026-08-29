<?php

/**
 * Document Utility Functions
 * 
 * Helper functions for document management in the reservation system.
 * These functions are reusable by future APIs for document validation,
 * path generation, and security checks.
 */

/**
 * Get document requirements configuration for a specific service type
 * 
 * @param string $serviceType The service type (e.g., 'Marriage', 'Baptism')
 * @return array Array of document requirements or empty array if not found
 */
function getDocumentRequirements(string $serviceType): array
{
    static $requirements = null;
    
    if ($requirements === null) {
        $requirements = require __DIR__ . '/../config/document_requirements.php';
    }
    
    return $requirements[$serviceType] ?? [];
}

/**
 * Check if a specific document type is required for a service
 * 
 * @param string $serviceType The service type
 * @param string $documentType The document type identifier
 * @return bool True if required, false otherwise
 */
function isRequiredDocument(string $serviceType, string $documentType): bool
{
    $requirements = getDocumentRequirements($serviceType);
    
    foreach ($requirements as $doc) {
        if ($doc['type'] === $documentType) {
            return $doc['required'] ?? false;
        }
    }
    
    return false;
}

/**
 * Get all allowed MIME types for document uploads
 * 
 * @return array Array of allowed MIME types
 */
function getAllowedMimeTypes(): array
{
    return [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf',
    ];
}

/**
 * Check if a MIME type is allowed
 * 
 * @param string $mimeType The MIME type to check
 * @return bool True if allowed, false otherwise
 */
function isAllowedMimeType(string $mimeType): bool
{
    return in_array($mimeType, getAllowedMimeTypes(), true);
}

/**
 * Get maximum file size for uploads (in bytes)
 * 
 * @return int Maximum file size in bytes (default: 5MB)
 */
function getMaximumFileSize(): int
{
    return 5 * 1024 * 1024; // 5MB
}

/**
 * Check if file size is within limits
 * 
 * @param int $fileSize File size in bytes
 * @return bool True if within limits, false otherwise
 */
function isValidFileSize(int $fileSize): bool
{
    return $fileSize > 0 && $fileSize <= getMaximumFileSize();
}

/**
 * Get file extension from MIME type
 * 
 * @param string $mimeType The MIME type
 * @return string File extension (without dot)
 */
function getExtensionFromMimeType(string $mimeType): string
{
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/png' => 'png',
        'application/pdf' => 'pdf',
    ];
    
    return $extensions[$mimeType] ?? 'bin';
}

/**
 * Generate the folder path for a reservation's documents
 * 
 * @param int $reservationId The reservation ID
 * @return string Relative path from server/uploads/
 */
function generateReservationFolder(int $reservationId): string
{
    return 'reservations/' . $reservationId;
}

/**
 * Generate a secure stored filename
 * 
 * @param string $originalFilename Original filename from user
 * @param string $documentType Document type identifier
 * @return string Secure filename
 */
function generateStoredFilename(string $originalFilename, string $documentType): string
{
    $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
    $timestamp = time();
    $random = bin2hex(random_bytes(4));
    
    return sprintf('%s_%s_%s.%s', $documentType, $timestamp, $random, $extension);
}

/**
 * Get full file path for a document
 * 
 * @param int $reservationId The reservation ID
 * @param string $storedFilename The stored filename
 * @return string Full relative path from server/
 */
function getDocumentFilePath(int $reservationId, string $storedFilename): string
{
    return generateReservationFolder($reservationId) . '/' . $storedFilename;
}

/**
 * Validate document status
 * 
 * @param string $status The status to validate
 * @return bool True if valid, false otherwise
 */
function isValidDocumentStatus(string $status): bool
{
    return in_array($status, ['Pending', 'Verified', 'Rejected'], true);
}

/**
 * Get all valid document statuses
 * 
 * @return array Array of valid statuses
 */
function getValidDocumentStatuses(): array
{
    return ['Pending', 'Verified', 'Rejected'];
}

/**
 * Check if a filename is safe (no path traversal)
 * 
 * @param string $filename The filename to check
 * @return bool True if safe, false otherwise
 */
function isSafeFilename(string $filename): bool
{
    // Check for path traversal attempts
    if (strpos($filename, '..') !== false) {
        return false;
    }
    
    // Check for absolute paths
    if (strpos($filename, '/') === 0 || strpos($filename, '\\') === 0) {
        return false;
    }
    
    // Check for null bytes
    if (strpos($filename, "\0") !== false) {
        return false;
    }
    
    return true;
}

/**
 * Get document type display name
 * 
 * @param string $serviceType The service type
 * @param string $documentType The document type identifier
 * @return string Display name or the document type if not found
 */
function getDocumentTypeName(string $serviceType, string $documentType): string
{
    $requirements = getDocumentRequirements($serviceType);
    
    foreach ($requirements as $doc) {
        if ($doc['type'] === $documentType) {
            return $doc['name'];
        }
    }
    
    return $documentType;
}

/**
 * Get all document types for a service
 * 
 * @param string $serviceType The service type
 * @return array Array of document type identifiers
 */
function getDocumentTypesForService(string $serviceType): array
{
    $requirements = getDocumentRequirements($serviceType);
    
    return array_column($requirements, 'type');
}

/**
 * Check if a document type exists for a service
 * 
 * @param string $serviceType The service type
 * @param string $documentType The document type identifier
 * @return bool True if exists, false otherwise
 */
function documentTypeExists(string $serviceType, string $documentType): bool
{
    return in_array($documentType, getDocumentTypesForService($serviceType), true);
}

/**
 * Get document summary for a reservation
 * 
 * @param PDO $db Database connection
 * @param int $reservationId The reservation ID
 * @param string $serviceType The service type
 * @return array Document summary statistics
 */
function getReservationDocumentSummary(PDO $db, int $reservationId, string $serviceType): array
{
    $requirements = getDocumentRequirements($serviceType);
    $requiredTypes = array_filter($requirements, fn($doc) => $doc['required'] ?? false);
    $totalRequired = count($requiredTypes);
    
    if ($totalRequired === 0) {
        return [
            'total_required' => 0,
            'uploaded' => 0,
            'verified' => 0,
            'rejected' => 0,
            'pending' => 0,
            'missing' => 0,
            'complete' => true,
        ];
    }
    
    $requiredTypeList = array_column($requiredTypes, 'type');
    
    $stmt = $db->prepare(
        'SELECT document_type, status FROM reservation_documents WHERE reservation_id = ?'
    );
    $stmt->execute([$reservationId]);
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $uploadedRequiredTypes = [];
    $verifiedCount = 0;
    $rejectedCount = 0;
    $pendingCount = 0;

    foreach ($documents as $doc) {
        if (!in_array($doc['document_type'], $requiredTypeList, true)) {
            continue;
        }

        $uploadedRequiredTypes[] = $doc['document_type'];

        switch ($doc['status']) {
            case 'Verified':
                $verifiedCount++;
                break;
            case 'Rejected':
                $rejectedCount++;
                break;
            case 'Pending':
                $pendingCount++;
                break;
        }
    }

    $missingTypes = array_diff($requiredTypeList, $uploadedRequiredTypes);
    $missingCount = count($missingTypes);

    return [
        'total_required' => $totalRequired,
        'uploaded' => count(array_unique($uploadedRequiredTypes)),
        'verified' => $verifiedCount,
        'rejected' => $rejectedCount,
        'pending' => $pendingCount,
        'missing' => $missingCount,
        'complete' => ($verifiedCount === $totalRequired && $rejectedCount === 0 && $missingCount === 0),
        'missing_types' => array_values($missingTypes),
    ];
}

/**
 * Check if all required documents for a reservation are verified
 * 
 * @param PDO $db Database connection
 * @param int $reservationId The reservation ID
 * @param string $serviceType The service type
 * @return bool True if all required documents are verified, false otherwise
 */
function areRequiredDocumentsVerified(PDO $db, int $reservationId, string $serviceType): bool
{
    $summary = getReservationDocumentSummary($db, $reservationId, $serviceType);
    return $summary['complete'];
}

/**
 * Calculate document progress percentage
 * 
 * @param PDO $db Database connection
 * @param int $reservationId The reservation ID
 * @param string $serviceType The service type
 * @return int Progress percentage (0-100)
 */
function calculateDocumentProgress(PDO $db, int $reservationId, string $serviceType): int
{
    $summary = getReservationDocumentSummary($db, $reservationId, $serviceType);
    
    if ($summary['total_required'] === 0) {
        return 100;
    }
    
    return (int) (($summary['verified'] / $summary['total_required']) * 100);
}
