-- Holy Family Parish Digital Record Management System
-- Database: holy_family_parish
--
-- Single source of truth for the production database schema.
-- A fresh import of this file creates the complete database without
-- running incremental migrations.
--
-- Modules included:
--   Authentication (users)
--   Reservations (reservations, reservation_documents)
--   Appointments (appointments, active_slot_key double-booking guard)
--   Notifications
--   SMS (sms_logs)
--   Parish Records
--   Reports (supported by indexes on status, dates, and foreign keys)
--
-- Migrations merged:
--   add_notifications.sql
--   add_appointment_enhancements.sql
--   add_sms_logs.sql
--   add_reservation_documents.sql
--   add_appointment_active_slot_unique.sql

CREATE DATABASE IF NOT EXISTS holy_family_parish
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE holy_family_parish;

-- ---------------------------------------------------------------------------
-- Authentication
-- Sessions are handled in PHP (HF_PARISH_SESSION cookie); no sessions table.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  appointment_updates TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Administrator Account
-- Email: admin@holyfamilyparish.com
-- Password: admin123
-- INSERT IGNORE keeps the existing hash on re-import; does not overwrite passwords.
INSERT IGNORE INTO users (fullname, email, phone, address, password, role) VALUES
('System Administrator', 'admin@holyfamilyparish.com', '09123456789', 'Holy Family Parish Office', '$2y$10$R/I1PMN/Akoiz3re9MZGWetmN450qE02dhBtSUYb6Ir55L5A2FoqS', 'admin');

-- ---------------------------------------------------------------------------
-- Reservations
-- Statuses: Pending, Approved, Rejected, Completed, Cancelled
-- Service types: Marriage, Funeral, Baptism, Mass Intention, Private Mass
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_type ENUM('Marriage', 'Funeral', 'Baptism', 'Mass Intention', 'Private Mass') NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  requirements TEXT NULL,
  status ENUM('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  remarks TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reservations_user (user_id),
  INDEX idx_reservations_status (status),
  INDEX idx_reservations_date (reservation_date, reservation_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document statuses: Pending, Verified, Rejected
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
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Upload timestamp',
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  INDEX idx_reservation_documents_reservation (reservation_id),
  INDEX idx_reservation_documents_status (status),
  INDEX idx_reservation_documents_type (document_type),
  INDEX idx_reservation_documents_uploaded (uploaded_at),
  UNIQUE KEY uk_reservation_document_type (reservation_id, document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores metadata for reservation requirement documents';

-- ---------------------------------------------------------------------------
-- Appointments
-- Statuses: Pending, Approved, Rejected, Completed, Cancelled
-- active_slot_key: partial unique guard (NULL when Rejected/Cancelled)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  purpose TEXT NOT NULL,
  remarks TEXT NULL,
  status ENUM('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  approved_by INT NULL,
  cancelled_at TIMESTAMP NULL DEFAULT NULL,
  active_slot_key VARCHAR(30) GENERATED ALWAYS AS (
    CASE
      WHEN status NOT IN ('Rejected', 'Cancelled')
      THEN CONCAT(appointment_date, ' ', appointment_time)
      ELSE NULL
    END
  ) STORED COMMENT 'Non-NULL only for active slots; backs uk_appointments_active_slot',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_appointments_user (user_id),
  INDEX idx_appointments_status (status),
  INDEX idx_appointments_cancelled (cancelled_at),
  INDEX idx_appointments_updated (updated_at),
  UNIQUE KEY uk_appointments_active_slot (active_slot_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Notifications
-- idx_notifications_read (user_id, is_read) supports unread-count queries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255) NULL,
  reference_type VARCHAR(50) NULL,
  reference_id INT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Parish Records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parish_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  service_type VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_parish_records_user (user_id),
  INDEX idx_parish_records_service (service_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- SMS
-- Statuses: sent, failed, pending
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sms_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'pending',
  provider VARCHAR(50) NOT NULL DEFAULT 'textbee',
  provider_message_id VARCHAR(255) NULL,
  response TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sms_logs_user (user_id),
  INDEX idx_sms_logs_status (status),
  INDEX idx_sms_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs all SMS attempts via TextBee provider';
