import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { Language } from '../i18n/translations';

export type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  characterName?: string;
  timestamp?: number;
};

export type Character = {
  id: string;
  name: string;
  gender: string;
  traits: string[];
  origin: string;
  height: string;
  hairColor: string;
  fear: string;
  hobby: string;
  secretTrait: string;
  house: string;
  sessionId: string;
  createdAt: string;
  attraction?: string;
  wand?: string;
};

export type AppContextType = {
  characters: Character[];
  setCharacters: (chars: Character[] | ((prev: Character[]) => Character[])) => void;
  activeCharacter: Character | null;
  setActiveCharacter: (char: Character | null) => void;
  sessionId: string;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  housePoints: { gryffindor: number; hufflepuff: number; ravenclaw: number; slytherin: number };
  gameState: { week: number; day: number; playerHouse: string } | null;
  setHousePoints: (p: any) => void;
  setGameState: (s: any) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const KNOWN_SESSIONS_KEY = 'hp_known_session_ids';

function trackKnownSessionId(sessionId: string) {
  const ids: string[] = JSON.parse(localStorage.getItem(KNOWN_SESSIONS_KEY) || '[]');
  if (!ids.includes(sessionId)) {
    localStorage.setItem(KNOWN_SESSIONS_KEY, JSON.stringify([...ids, sessionId]));
  }
}

export function mapDbCharacterToCharacter(row: Record<string, unknown>): Character {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    gender: String(row.gender || ''),
    traits: Array.isArray(row.traits) ? row.traits as string[] : [],
    origin: String(row.origin || ''),
    height: String(row.height || ''),
    hairColor: String(row.hair_color || row.hairColor || ''),
    fear: String(row.fear || ''),
    hobby: String(row.hobby || ''),
    secretTrait: String(row.secret_trait || row.secretTrait || ''),
    house: String(row.player_house || row.house || ''),
    sessionId: String(row.session_id || row.sessionId || ''),
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
    attraction: row.attraction ? String(row.attraction) : undefined,
    wand: row.wand ? String(row.wand) : undefined,
  };
}

export async function saveCharacterToDB(character: Character, sessionId: string) {
  try {
    await fetch('https://hogwarts-2.onrender.com/api/save-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, character }),
    });
    trackKnownSessionId(sessionId);
  } catch (e) {
    console.error('saveCharacterToDB error:', e);
  }
}

export async function loadCharactersFromDB(sessionId: string): Promise<Character[]> {
  try {
    const res = await fetch(
      `https://hogwarts-2.onrender.com/api/load-characters?session_id=${encodeURIComponent(sessionId)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.characters || []).map(mapDbCharacterToCharacter);
  } catch (e) {
    console.error('loadCharactersFromDB error:', e);
    return [];
  }
}

export async function loadAllCharactersFromDB(): Promise<Character[]> {
  const sessionIds: string[] = JSON.parse(localStorage.getItem(KNOWN_SESSIONS_KEY) || '[]');
  const merged = new Map<string, Character>();
  for (const sid of sessionIds) {
    const chars = await loadCharactersFromDB(sid);
    for (const c of chars) {
      merged.set(c.id, c);
    }
  }
  return [...merged.values()];
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [characters, setCharacters] = useState<Character[]>(
    () => {
      const saved = localStorage.getItem('hp_characters');
      return saved ? JSON.parse(saved) : [];
    }
  );
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(() => {
    const activeCharId = localStorage.getItem('hp_active_character_id');
    const characters = JSON.parse(localStorage.getItem('hp_characters') || '[]');
    const activeChar = characters.find((c: any) => c.id === activeCharId);
    return activeChar || null;
  });
  const sessionId = useMemo(() => {
    return activeCharacter?.sessionId || crypto.randomUUID();
  }, [activeCharacter]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [housePoints, setHousePoints] = useState<{ gryffindor: number; hufflepuff: number; ravenclaw: number; slytherin: number }>(
    { gryffindor: 0, hufflepuff: 0, ravenclaw: 0, slytherin: 0 }
  );
  const [gameState, setGameState] = useState<{ week: number; day: number; playerHouse: string } | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('hp_language') as Language) || 'tr';
  });

  const handleSetLanguage = (lang: Language) => {
    localStorage.setItem('hp_language', lang);
    setLanguage(lang);
  };

  useEffect(() => {
    localStorage.setItem('hp_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    const syncFromDb = async () => {
      const saved = localStorage.getItem('hp_characters');
      if (saved && JSON.parse(saved).length > 0) return;
      const fromDb = await loadAllCharactersFromDB();
      if (fromDb.length > 0) {
        setCharacters(fromDb);
      }
    };
    syncFromDb();
  }, []);

  useEffect(() => {
    if (activeCharacter) {
      localStorage.setItem('hp_active_character_id', activeCharacter.id);
    } else {
      localStorage.removeItem('hp_active_character_id');
    }
  }, [activeCharacter]);

  return (
    <AppContext.Provider
      value={{
        characters,
        setCharacters,
        activeCharacter,
        setActiveCharacter,
        sessionId,
        messages,
        setMessages,
        isLoading,
        setIsLoading,
        housePoints,
        gameState,
        setHousePoints,
        setGameState,
        language,
        setLanguage: handleSetLanguage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
