-- Zaman tabanlı minimum ev puanı: her 5 dk taban +5 (başlangıç 5)
ALTER TABLE game_state
  ADD COLUMN IF NOT EXISTS points_floor_started_at TIMESTAMP DEFAULT NOW();

UPDATE game_state
SET points_floor_started_at = COALESCE(points_floor_started_at, updated_at, NOW())
WHERE points_floor_started_at IS NULL;
