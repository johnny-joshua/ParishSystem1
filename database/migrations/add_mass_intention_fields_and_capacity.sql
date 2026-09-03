-- Mass Intention workflow fields and status.
ALTER TABLE reservations
  MODIFY status ENUM('Pending', 'Under Review', 'Approved', 'Rejected', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  ADD COLUMN intention_name VARCHAR(255) NULL AFTER requirements,
  ADD COLUMN prayer_intention TEXT NULL AFTER intention_name,
  ADD COLUMN payment_amount DECIMAL(10,2) NULL AFTER prayer_intention,
  ADD COLUMN payment_method VARCHAR(50) NULL AFTER payment_amount,
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at;