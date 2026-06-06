-- Supabase SQL Editor'da çalıştır.

CREATE TABLE IF NOT EXISTS missed_class_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  week INTEGER NOT NULL,
  day INTEGER NOT NULL,
  attended BOOLEAN DEFAULT FALSE,
  penalty_applied INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, subject, week, day)
);
