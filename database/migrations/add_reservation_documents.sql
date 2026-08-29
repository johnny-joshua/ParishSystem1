-- Migration: Add Reservation Documents Table
-- Description: Create normalized table for storing reservation document metadata
-- Phase: 2 - Infrastructure Preparation
-- Date: 2025-01-08

USE holy_family_parish;

-- Create reservation_documents table
CREATE TABLE IF NOT EXISTS reservation_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL COMMENT 'Human-readable document name (e.g., Birth Certificate)',
  document_type VARCHAR(100) NOT NULL COMMENT 'Document type identifier (e.g., birth_certificate)',
  original_filename VARCHAR(255) NOT NULL COMMENT 'Original filename from user upload',
  stored_filename VARCHAR(255) NOT NULL COMMENT 'System-generated filename for storage',
  file_path VARCHAR(500) NOT NULL COMMENT 'Relative path to stored file',
  mime_type VARCHAR(100) NOT NULL COMMENT 'File MIME type',
  file_size INT NOT NULL COMMENT 'File size in bytes',
  status ENUM('Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending' COMMENT 'Document verification status',
  remarks TEXT NULL COMMENT 'Admin remarks about the document',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Upload timestamp',
  
  -- Foreign key to reservations with cascade delete
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- Indexes for performance
  INDEX idx_reservation_documents_reservation (reservation_id),
  INDEX idx_reservation_documents_status (status),
  INDEX idx_reservation_documents_type (document_type),
  INDEX idx_reservation_documents_uploaded (uploaded_at),
  
  -- Unique constraint to prevent duplicate document types per reservation
  UNIQUE KEY uk_reservation_document_type (reservation_id, document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores metadata for reservation requirement documents';
