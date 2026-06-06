-- Kullanıcılar
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  patreon_id TEXT,
  daily_message_count INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Karakterler (sabit, admin tarafından doldurulur)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  house TEXT,
  personality TEXT NOT NULL,
  speech_style TEXT NOT NULL,
  likes TEXT,
  dislikes TEXT,
  base_prompt TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Mekanlar (sabit, admin tarafından doldurulur)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  background_url TEXT,
  lore_context TEXT,
  characters_present UUID[]
);

-- Kullanıcı hafızası (her konuşma sonunda AI tarafından doldurulur)
CREATE TABLE user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id),
  summary TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Kullanıcı-karakter ilişki skoru
CREATE TABLE character_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id),
  relationship_score INTEGER DEFAULT 0 CHECK (relationship_score BETWEEN -100 AND 100),
  notes TEXT,
  last_interaction TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, character_id)
);

-- Lore parçaları (RAG için)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE lore_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  category TEXT,
  tags TEXT[]
);

-- Mesaj geçmişi (konuşma bitti → silinir, özet kalır)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  character_id UUID REFERENCES characters(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ev puanları (tüm session'lar için global değil, per-session)
CREATE TABLE house_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  gryffindor INTEGER DEFAULT 0,
  hufflepuff INTEGER DEFAULT 0,
  ravenclaw INTEGER DEFAULT 0,
  slytherin INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Puan olayları log (audit trail + hikaye tutarlılığı)
CREATE TABLE house_point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  house TEXT NOT NULL CHECK (house IN ('gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin')),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('player_action', 'missed_class', 'natural_drift', 'event_spike', 'world_event', 'conversation_event', 'organic_drift')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Oyun durumu (takvim + son aktivite zamanı)
CREATE TABLE game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  current_week INTEGER DEFAULT 1,
  current_day INTEGER DEFAULT 1,   -- 1=Pazartesi ... 5=Cuma ... 7=Pazar
  current_hour INTEGER DEFAULT 8,  -- 0-23
  last_activity_at TIMESTAMP DEFAULT NOW(),
  player_house TEXT DEFAULT 'gryffindor' CHECK (player_house IN ('gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin')),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Karakter ilişki skorları (gizli, system prompt'a enjekte edilir)
CREATE TABLE character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  score INTEGER DEFAULT 0 CHECK (score BETWEEN -100 AND 100),
  last_interaction TEXT,
  relationship_type TEXT DEFAULT 'neutral' CHECK (relationship_type IN ('neutral', 'friendship', 'romance', 'rivalry')),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, character_name)
);
