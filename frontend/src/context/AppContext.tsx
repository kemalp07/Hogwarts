import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';

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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

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

  useEffect(() => {
    localStorage.setItem('hp_characters', JSON.stringify(characters));
  }, [characters]);

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
