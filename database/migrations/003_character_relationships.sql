-- Supabase SQL Editor'da çalıştır.

CREATE TABLE IF NOT EXISTS character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  score INTEGER DEFAULT 0 CHECK (score BETWEEN -100 AND 100),
  last_interaction TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, character_name)
);
