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
    const activeId = localStorage.getItem('hp_active_character_id');
    if (!activeId) return null;
    const saved = localStorage.getItem('hp_characters');
    if (!saved) return null;
    const chars = JSON.parse(saved);
    return chars.find((c: Character) => c.id === activeId) || null;
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
