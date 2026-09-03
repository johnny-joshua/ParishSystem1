-- Structured Funeral reservation details and idempotent official-record link.
ALTER TABLE reservations ADD COLUMN service_details JSON NULL AFTER requirements;
ALTER TABLE parish_records
  ADD COLUMN reservation_id INT NULL AFTER user_id,
  ADD CONSTRAINT fk_parish_records_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
  ADD UNIQUE KEY uk_parish_records_reservation (reservation_id);