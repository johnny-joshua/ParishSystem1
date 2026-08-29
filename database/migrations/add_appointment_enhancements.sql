-- Migration: Add Appointment Enhancements
-- Description: Add remarks, updated_at, approved_by, cancelled_at fields and Cancel status to appointments table
-- Date: 2025-01-07

USE holy_family_parish;

-- Add remarks column for admin notes
ALTER TABLE appointments 
ADD COLUMN remarks TEXT NULL AFTER purpose;

-- Add updated_at timestamp for tracking modifications
ALTER TABLE appointments 
ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL AFTER created_at;

-- Add approved_by column to track which admin approved/rejected the appointment
ALTER TABLE appointments 
ADD COLUMN approved_by INT NULL AFTER updated_at,
ADD FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add cancelled_at timestamp to track when appointments were cancelled
ALTER TABLE appointments 
ADD COLUMN cancelled_at TIMESTAMP NULL DEFAULT NULL AFTER approved_by;

-- Update status enum to include Cancelled
-- Note: MySQL doesn't support direct ENUM modification, so we need to recreate the column
ALTER TABLE appointments 
MODIFY COLUMN status ENUM('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending';

-- Add index on cancelled_at for faster queries
CREATE INDEX idx_appointments_cancelled ON appointments(cancelled_at);

-- Add index on updated_at for sorting by last modified
CREATE INDEX idx_appointments_updated ON appointments(updated_at);
