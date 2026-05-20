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
