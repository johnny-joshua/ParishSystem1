# Reservation Document Upload - Phase 3 Documentation

## Overview

Phase 3 implements the backend upload service for Reservation Documents. This phase provides secure upload, download, listing, and deletion functionality without modifying the frontend.

---

## Folder Structure

```
server/
├── api/
│   └── reservations/
│       ├── index.php              # Existing reservation API
│       ├── availability.php       # Existing availability API
│       ├── documents.php          # NEW: Document upload/list/delete
│       └── download.php           # NEW: Secure document download
├── config/
│   └── document_requirements.php  # Phase 2: Document requirements config
├── utils/
│   ├── documents.php              # Phase 2: Document helper functions
│   └── upload.php                 # NEW: Upload utility functions
└── uploads/
    ├── .htaccess                  # Phase 2: Block direct access
    └── reservations/
        └── .htaccess              # Phase 2: Block direct access
        └── [reservation_id]/      # Created dynamically
            ├── birth_certificate.pdf
            ├── valid_id.jpg
            └── ...
```

---

## Upload Workflow

```
User uploads document
    ↓
POST /api/reservations/documents.php
    ↓
Validate authentication
    ↓
Verify reservation ownership (owner or admin)
    ↓
Validate document type exists for service
    ↓
Validate uploaded file (MIME, size, errors)
    ↓
BEGIN TRANSACTION
    ↓
Create reservation folder (if not exists)
    ↓
Generate secure filename
    ↓
Move uploaded file to secure location
    ↓
Insert record into reservation_documents
    ↓
COMMIT
    ↓
Return success response
    ↓
[On failure] ROLLBACK + delete uploaded file
```

---

## Authentication Flow

### Authentication Required
All endpoints require authentication via `requireAuth()` middleware.

### Authorization Rules

| Endpoint | Reservation Owner | Administrator |
|----------|------------------|---------------|
| Upload   | ✅ Own reservations only | ✅ All reservations |
| List     | ✅ Own reservations only | ✅ All reservations |
| Download | ✅ Own reservations only | ✅ All reservations |
| Delete   | ✅ Own reservations only | ✅ All reservations |

### HTTP Status Codes

- **200** - Success
- **201** - Created (upload success)
- **400** - Bad Request (invalid input)
- **401** - Unauthorized (not logged in)
- **403** - Forbidden (no permission)
- **404** - Not Found (reservation/document missing)
- **405** - Method Not Allowed
- **422** - Validation Error
- **500** - Server Error

---

## Database Transaction Flow

### Upload Transaction

```php
BEGIN TRANSACTION
    ↓
Validate request
    ↓
Validate reservation ownership
    ↓
Validate document type
    ↓
Validate file
    ↓
Create reservation folder
    ↓
Generate secure filename
    ↓
Move uploaded file
    ↓
INSERT reservation_documents row
    ↓
COMMIT
    ↓
[On error] ROLLBACK + delete file
```

### Delete Transaction

```php
BEGIN TRANSACTION
    ↓
Verify ownership
    ↓
Delete physical file
    ↓
DELETE database row
    ↓
Cleanup empty folder
    ↓
COMMIT
    ↓
[On error] ROLLBACK
```

**Important:** Filesystem and database are kept synchronized through transactions. If any step fails, all changes are rolled back.

---

## Security Design

### File Validation

1. **Upload Error Checking**
   - Validates PHP upload error codes
   - Returns specific error messages

2. **File Size Validation**
   - Maximum: 5MB
   - Minimum: 1 byte (detects empty files)

3. **MIME Type Validation**
   - Uses `finfo` for reliable detection
   - Never trusts `$_FILES['type']`
   - Allowed: image/jpeg, image/png, application/pdf

4. **Filename Safety**
   - Blocks path traversal (`..`)
   - Blocks absolute paths
   - Blocks null bytes
   - Uses `basename()` for extraction

5. **File Extension Validation**
   - Derived from MIME type (not filename)
   - Prevents extension spoofing

### Disallowed File Types

- PHP files (`.php`, `.php5`, `.php4`, `.php3`, `.phtml`)
- JavaScript files (`.js`)
- Executables (`.exe`, `.bat`, `.cmd`, `.sh`, `.bash`)
- Archives (`.zip`, `.rar`)
- HTML files (`.html`, `.htm`)
- SVG files (`.svg`)

### Storage Security

- Files stored outside web root (`server/uploads/`)
- `.htaccess` blocks all direct access
- PHP execution blocked in upload directories
- Script file extensions blocked
- Directory browsing disabled
- All access through authenticated API

### Path Security

- All paths validated against base upload directory
- `realpath()` used for normalization
- Prevents directory traversal
- Prevents symlink attacks

### File Permissions

- Folders: 0755 (rwxr-xr-x)
- Files: 0644 (rw-r--r--)
- Restrictive to prevent execution

---

## API Endpoints

### 1. Upload Document

**Endpoint:** `POST /api/reservations/documents.php`

**Request:** `multipart/form-data`

**Parameters:**
- `reservation_id` (int, required) - Reservation ID
- `document_type` (string, required) - Document type identifier
- `document` (file, required) - Uploaded file

**Response (201):**
```json
{
  "success": true,
  "message": "Document uploaded successfully.",
  "data": {
    "id": 123,
    "document_name": "Birth Certificate",
    "document_type": "birth_certificate",
    "original_filename": "birth_cert.pdf",
    "file_size": 524288,
    "status": "Pending"
  }
}
```

**Error (422):**
```json
{
  "success": false,
  "message": "Invalid file type. Only JPG, PNG, and PDF files are allowed.",
  "errors": null
}
```

---

### 2. List Documents

**Endpoint:** `GET /api/reservations/documents.php?reservation_id={id}`

**Parameters:**
- `reservation_id` (int, required) - Reservation ID

**Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "documents": [
      {
        "id": 123,
        "document_name": "Birth Certificate",
        "document_type": "birth_certificate",
        "original_filename": "birth_cert.pdf",
        "file_size": 524288,
        "status": "Pending",
        "remarks": null,
        "uploaded_at": "2025-01-08 10:30:00"
      }
    ],
    "total": 1
  }
}
```

---

### 3. Delete Document

**Endpoint:** `DELETE /api/reservations/documents.php?id={id}`

**Parameters:**
- `id` (int, required) - Document ID

**Response (200):**
```json
{
  "success": true,
  "message": "Document deleted successfully.",
  "data": null
}
```

---

### 4. Download Document

**Endpoint:** `GET /api/reservations/download.php?id={id}`

**Parameters:**
- `id` (int, required) - Document ID

**Response:**
- Binary file stream
- Headers: `Content-Type`, `Content-Disposition`, `Content-Length`

**Error (404):**
```json
{
  "success": false,
  "message": "File not found on server.",
  "errors": null
}
```

---

## Utility Functions

### upload.php Functions

| Function | Purpose |
|----------|---------|
| `validateUploadedFile()` | Validates uploaded file (MIME, size, errors) |
| `createReservationFolder()` | Creates reservation upload folder |
| `moveUploadedFileSecurely()` | Moves file with security checks |
| `deleteUploadedFile()` | Deletes file with path validation |
| `uploadedFileExists()` | Checks if file exists securely |
| `getAbsoluteFilePath()` | Gets absolute path with validation |
| `cleanupEmptyReservationFolder()` | Removes empty reservation folders |

### documents.php Functions (Phase 2)

| Function | Purpose |
|----------|---------|
| `getDocumentRequirements()` | Gets document requirements config |
| `isRequiredDocument()` | Checks if document is required |
| `getAllowedMimeTypes()` | Returns allowed MIME types |
| `isAllowedMimeType()` | Validates MIME type |
| `getMaximumFileSize()` | Returns max file size (5MB) |
| `isValidFileSize()` | Validates file size |
| `generateReservationFolder()` | Generates folder path |
| `generateStoredFilename()` | Generates secure filename |
| `getDocumentFilePath()` | Gets full file path |
| `isValidDocumentStatus()` | Validates document status |
| `isSafeFilename()` | Checks filename safety |
| `getDocumentTypeName()` | Gets display name |
| `getDocumentTypesForService()` | Gets all document types |
| `documentTypeExists()` | Checks if type exists |

---

## Future Integration with Reservation.jsx

### Phase 4 - Admin Review Workflow

1. **Admin Document Review Page**
   - List pending documents for a reservation
   - Preview documents (PDF viewer, image viewer)
   - Approve/Reject documents with remarks
   - Update document status in database

2. **Status Update API**
   - PATCH endpoint for document status
   - Admin-only access
   - Notify users on status change

3. **Reservation Approval Integration**
   - Check if all required documents are verified
   - Block reservation approval if documents pending/rejected
   - Show document status in reservation details

### Phase 5 - Frontend Integration

1. **Reservation.jsx Enhancements**
   - Show document requirements based on service type
   - Upload UI with drag-and-drop
   - Progress indicators for uploads
   - Document status display
   - Document preview/download buttons

2. **API Integration**
   - Call documents API on reservation creation
   - Poll for document status updates
   - Handle upload errors gracefully

---

## Future Document Versioning Support

### Current Architecture Supports:

1. **Multiple Uploads**
   - Unique constraint on `(reservation_id, document_type)` currently prevents duplicates
   - To support versioning, change to allow multiple with `is_active` flag
   - Helper functions already support multiple documents per type

2. **Document Archiving**
   - Delete function removes both file and database record
   - For versioning, add `archived_at` timestamp instead of deletion
   - Archive old documents when new version uploaded

3. **Document History**
   - Upload functions don't assume single document per type
   - Can add `version` column to track document versions
   - Helper functions can be extended to query by version

### Recommended Future Changes:

1. **Database Schema (Phase 4+)**
   ```sql
   ALTER TABLE reservation_documents
   ADD COLUMN is_active TINYINT(1) DEFAULT 1,
   ADD COLUMN version INT DEFAULT 1,
   ADD COLUMN archived_at TIMESTAMP NULL,
   ADD COLUMN replaced_by INT NULL;
   
   -- Remove unique constraint to allow multiple versions
   ALTER TABLE reservation_documents DROP INDEX uk_reservation_document_type;
   
   -- Add unique constraint for active documents
   ALTER TABLE reservation_documents 
   ADD UNIQUE KEY uk_active_document (reservation_id, document_type, is_active);
   ```

2. **Upload Logic (Phase 4+)**
   - When replacing a document:
     - Set old document `is_active = 0`
     - Set old document `archived_at = NOW()`
     - Set new document `version = old_version + 1`
     - Keep old file for audit trail

3. **Helper Functions (Phase 4+)**
   - Add `getActiveDocument()`
   - Add `getDocumentHistory()`
   - Add `archiveDocument()`
   - Extend existing functions with version parameters

---

## Testing Checklist

### Upload Functionality
- [ ] Upload valid PDF file
- [ ] Upload valid JPG file
- [ ] Upload valid PNG file
- [ ] Reject PHP file
- [ ] Reject EXE file
- [ ] Reject file > 5MB
- [ ] Reject empty file
- [ ] Reject invalid document type
- [ ] Upload to own reservation (success)
- [ ] Upload to another's reservation (403)
- [ ] Upload to non-existent reservation (404)

### List Functionality
- [ ] List documents for own reservation
- [ ] List documents for another's reservation (403)
- [ ] List documents for non-existent reservation (404)
- [ ] Admin can list any reservation's documents

### Download Functionality
- [ ] Download own document
- [ ] Download another's document (403)
- [ ] Download non-existent document (404)
- [ ] Admin can download any document
- [ ] Correct Content-Type header
- [ ] Correct filename in Content-Disposition

### Delete Functionality
- [ ] Delete own document
- [ ] Delete another's document (403)
- [ ] Delete non-existent document (404)
- [ ] Admin can delete any document
- [ ] File deleted from filesystem
- [ ] Database record deleted
- [ ] Empty folder cleaned up

### Transaction Safety
- [ ] File deleted on database rollback
- [ ] Database record deleted on file failure
- [ ] Folder creation failure handled
- [ ] File move failure handled

### Security
- [ ] Path traversal blocked
- [ ] Direct access blocked via .htaccess
- [ ] PHP execution blocked
- [ ] MIME type spoofing prevented
- [ ] Unauthenticated access blocked (401)
- [ ] Unauthorized access blocked (403)

---

## Preparation for Phase 4

### Completed in Phase 3:
- ✅ Secure upload infrastructure
- ✅ Document storage with validation
- ✅ Authentication and authorization
- ✅ Transaction safety
- ✅ Future-proof architecture for versioning

### Phase 4 Tasks:
- Create admin document review UI
- Implement document status update API
- Add document verification workflow
- Integrate with reservation approval
- Add document notifications

### Phase 5 Tasks:
- Update Reservation.jsx with upload UI
- Add document preview functionality
- Implement drag-and-drop upload
- Show document status to users
- Add progress indicators

---

## Notes

- **No frontend changes** in Phase 3
- **Existing Reservation module** continues working unchanged
- **All endpoints** follow existing project architecture
- **Feature-based organization** maintained (inside reservations module)
- **Reusable helper functions** for future phases
- **Defense-ready code** suitable for capstone presentation
