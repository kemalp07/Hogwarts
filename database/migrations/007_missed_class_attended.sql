-- Supabase SQL Editor'da çalıştır (006 zaten uygulandıysa).

ALTER TABLE missed_class_log
ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;

ALTER TABLE missed_class_log
ALTER COLUMN penalty_applied SET DEFAULT 0;
