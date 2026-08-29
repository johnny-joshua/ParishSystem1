-- Migration: Add Appointment Updates notification preference
-- Description: Persist per-user preference for appointment notifications and SMS
-- Default: enabled (1) for existing and new users
-- Run: mysql -u root holy_family_parish < database/migrations/add_appointment_updates_preference.sql

USE holy_family_parish;

ALTER TABLE users
ADD COLUMN appointment_updates TINYINT(1) NOT NULL DEFAULT 1
AFTER role;
