<?php

/**
 * Upload Utility Functions
 * 
 * Helper functions for secure file upload handling in the reservation system.
 * These functions are reusable by future APIs for file validation,
 * folder creation, and secure file operations.
 * 
 * Design Considerations for Future Document Versioning:
 * - Functions do not assume a document can only exist once
 * - Multiple uploads of the same document type are supported
 * - File operations are atomic where possible
 * - Functions return structured results for easy extension
 */

require_once __DIR__ . '/documents.php';

/**
 * Validate an uploaded file
 * 
 * @param array $fileFile The $_FILES array element
 * @return array Result with 'valid' boolean and 'error' message if invalid
 */
function validateUploadedFile(array $fileFile): array
{
    // Check for upload errors
    if (!isset($fileFile['error']) || is_array($fileFile['error'])) {
        return ['valid' => false, 'error' => 'Invalid file upload.'];
    }

    $uploadError = (int) $fileFile['error'];
    if ($uploadError !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive.',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive.',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded.',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload.',
        ];
        return [
            'valid' => false,
            'error' => $errorMessages[$uploadError] ?? 'Unknown upload error.'
        ];
    }

    // Check if file is empty
    if ($fileFile['size'] === 0) {
        return ['valid' => false, 'error' => 'Uploaded file is empty.'];
    }

    // Validate file size
    if (!isValidFileSize((int) $fileFile['size'])) {
        return [
            'valid' => false,
            'error' => 'File size exceeds maximum allowed size of 5MB.'
        ];
    }

    // Validate filename is safe
    if (!isSafeFilename($fileFile['name'])) {
        return ['valid' => false, 'error' => 'Filename contains invalid characters.'];
    }

    // Validate MIME type using finfo (more reliable than $_FILES['type'])
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $detectedMime = $finfo->file($fileFile['tmp_name']);
    
    if (!isAllowedMimeType($detectedMime)) {
        return [
            'valid' => false,
            'error' => 'Invalid file type. Only JPG, PNG, and PDF files are allowed.'
        ];
    }

    return ['valid' => true, 'mime_type' => $detectedMime];
}

/**
 * Create a reservation upload folder if it doesn't exist
 * 
 * @param int $reservationId The reservation ID
 * @param string $baseUploadDir Base upload directory (e.g., __DIR__ . '/../uploads')
 * @return array Result with 'success' boolean and 'path' if successful
 */
function createReservationFolder(int $reservationId, string $baseUploadDir): array
{
    $folderPath = $baseUploadDir . '/' . generateReservationFolder($reservationId);
    
    // Normalize path and prevent directory traversal
    $realPath = realpath($baseUploadDir);
    if ($realPath === false) {
        return ['success' => false, 'error' => 'Base upload directory does not exist.'];
    }
    
    $targetPath = realpath($baseUploadDir) . '/' . generateReservationFolder($reservationId);
    
    // Check if folder already exists
    if (is_dir($targetPath)) {
        return ['success' => true, 'path' => $targetPath];
    }
    
    // Create folder with restrictive permissions
    if (!mkdir($targetPath, 0755, true)) {
        return ['success' => false, 'error' => 'Failed to create upload folder.'];
    }
    
    return ['success' => true, 'path' => $targetPath];
}

/**
 * Move an uploaded file to its destination
 * 
 * @param array $fileFile The $_FILES array element
 * @param string $destinationPath Full destination path
 * @return array Result with 'success' boolean and 'error' if failed
 */
function moveUploadedFileSecurely(array $fileFile, string $destinationPath): array
{
    // Validate destination path is within uploads directory
    $baseUploadDir = realpath(__DIR__ . '/../uploads');
    if ($baseUploadDir === false) {
        return ['success' => false, 'error' => 'Base upload directory does not exist.'];
    }

    $destinationDir = dirname($destinationPath);
    if (!is_dir($destinationDir) && !mkdir($destinationDir, 0755, true)) {
        return ['success' => false, 'error' => 'Failed to create upload directory.'];
    }

    $realDestination = realpath($destinationDir);

    if ($realDestination === false || strpos($realDestination, $baseUploadDir) !== 0) {
        return ['success' => false, 'error' => 'Invalid destination path.'];
    }
    
    // Use move_uploaded_file for security
    if (!move_uploaded_file($fileFile['tmp_name'], $destinationPath)) {
        return ['success' => false, 'error' => 'Failed to move uploaded file.'];
    }
    
    // Set restrictive file permissions
    chmod($destinationPath, 0644);
    
    return ['success' => true];
}

/**
 * Delete a file from the filesystem
 * 
 * @param string $filePath The file path relative to server/uploads/
 * @param string $baseUploadDir Base upload directory
 * @return array Result with 'success' boolean and 'error' if failed
 */
function deleteUploadedFile(string $filePath, string $baseUploadDir): array
{
    $filePath = preg_replace('#^uploads/#', '', $filePath);
    $fullPath = $baseUploadDir . '/' . $filePath;
    
    // Normalize path and prevent directory traversal
    $realBase = realpath($baseUploadDir);
    $realPath = realpath($fullPath);
    
    if ($realPath === false) {
        return ['success' => true]; // File doesn't exist, consider it deleted
    }
    
    // Ensure file is within uploads directory
    if (strpos($realPath, $realBase) !== 0) {
        return ['success' => false, 'error' => 'Invalid file path.'];
    }
    
    // Delete file
    if (!unlink($realPath)) {
        return ['success' => false, 'error' => 'Failed to delete file.'];
    }
    
    return ['success' => true];
}

/**
 * Check if a file exists in the filesystem
 * 
 * @param string $filePath The file path relative to server/uploads/
 * @param string $baseUploadDir Base upload directory
 * @return bool True if file exists, false otherwise
 */
function uploadedFileExists(string $filePath, string $baseUploadDir): bool
{
    $filePath = preg_replace('#^uploads/#', '', $filePath);
    $fullPath = $baseUploadDir . '/' . $filePath;
    
    $realBase = realpath($baseUploadDir);
    $realPath = realpath($fullPath);
    
    if ($realPath === false) {
        return false;
    }
    
    // Ensure file is within uploads directory
    if (strpos($realPath, $realBase) !== 0) {
        return false;
    }
    
    return is_file($realPath);
}

/**
 * Get the absolute path for a stored file
 * 
 * @param string $relativePath Relative path from server/uploads/
 * @param string $baseUploadDir Base upload directory
 * @return string|null Absolute path or null if invalid
 */
function getAbsoluteFilePath(string $relativePath, string $baseUploadDir): ?string
{
    $relativePath = preg_replace('#^uploads/#', '', $relativePath);
    $fullPath = $baseUploadDir . '/' . $relativePath;
    
    $realBase = realpath($baseUploadDir);
    $realPath = realpath($fullPath);
    
    if ($realPath === false) {
        return null;
    }
    
    // Ensure file is within uploads directory
    if (strpos($realPath, $realBase) !== 0) {
        return null;
    }
    
    return $realPath;
}

/**
 * Clean up empty reservation folders
 * 
 * This function can be called after document deletion to remove
 * empty reservation folders, keeping the filesystem clean.
 * 
 * @param int $reservationId The reservation ID
 * @param string $baseUploadDir Base upload directory
 * @return bool True if folder was removed or didn't exist
 */
function cleanupEmptyReservationFolder(int $reservationId, string $baseUploadDir): bool
{
    $folderPath = $baseUploadDir . '/' . generateReservationFolder($reservationId);
    $realPath = realpath($folderPath);
    
    if ($realPath === false || !is_dir($realPath)) {
        return true; // Folder doesn't exist
    }
    
    // Check if folder is empty
    $files = scandir($realPath);
    $files = array_diff($files, ['.', '..']);
    
    if (empty($files)) {
        return rmdir($realPath);
    }
    
    return true; // Folder not empty, don't delete
}
