-- Prevent duplicate notifications for the same recipient and reservation/request event.
ALTER TABLE notifications
  ADD UNIQUE KEY uk_notifications_event (user_id, type, reference_type, reference_id);