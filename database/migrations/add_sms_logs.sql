-- Migration: Add SMS Logs Table
-- This migration creates a table to log all SMS attempts via TextBee

USE holy_family_parish;

CREATE TABLE IF NOT EXISTS sms_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'pending',
  provider VARCHAR(50) NOT NULL DEFAULT 'textbee',
  provider_message_id VARCHAR(255) NULL,
  response TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sms_logs_user (user_id),
  INDEX idx_sms_logs_status (status),
  INDEX idx_sms_logs_created (created_at)
) ENGINE=InnoDB;
