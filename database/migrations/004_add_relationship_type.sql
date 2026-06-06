-- Supabase SQL Editor'da çalıştır.

ALTER TABLE character_relationships
ADD COLUMN IF NOT EXISTS relationship_type TEXT DEFAULT 'neutral'
CHECK (relationship_type IN ('neutral', 'friendship', 'romance', 'rivalry'));
