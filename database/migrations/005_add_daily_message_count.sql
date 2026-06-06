-- Supabase SQL Editor'da çalıştır.

ALTER TABLE game_state
ADD COLUMN IF NOT EXISTS daily_message_count INTEGER DEFAULT 0;
