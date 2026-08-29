-- Migration: Prevent double-booking of active appointment slots
-- Description: Partial unique index via generated column; NULL when status is Rejected/Cancelled
-- Date: 2026-07-31

USE holy_family_parish;

ALTER TABLE appointments
ADD COLUMN active_slot_key VARCHAR(30) GENERATED ALWAYS AS (
  CASE
    WHEN status NOT IN ('Rejected', 'Cancelled')
    THEN CONCAT(appointment_date, ' ', appointment_time)
    ELSE NULL
  END
) STORED;

CREATE UNIQUE INDEX uk_appointments_active_slot ON appointments (active_slot_key);
