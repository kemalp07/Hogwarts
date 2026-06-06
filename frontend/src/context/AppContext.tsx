import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  characterName?: string;
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
  const [sessionId] = useState(() => {
    const activeCharId = localStorage.getItem('hp_active_character_id');
    const characters = JSON.parse(localStorage.getItem('hp_characters') || '[]');
    const activeChar = characters.find((c: any) => c.id === activeCharId);
    return activeChar?.sessionId || crypto.randomUUID();
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
