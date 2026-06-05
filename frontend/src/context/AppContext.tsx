import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

export type AppContextType = {
  userName: string;
  setUserName: (name: string) => void;
  sessionId: string;
  setSessionId: (id: string) => void;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  hogwartsHouse: string;
  setHogwartsHouse: (house: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('hp_user_name') || '');
  const [sessionId, setSessionId] = useState<string>(() => {
    const existing = localStorage.getItem('hp_session_id');
    if (existing) return existing;
    const newId = crypto.randomUUID();
    localStorage.setItem('hp_session_id', newId);
    return newId;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hogwartsHouse, setHogwartsHouse] = useState<string>('');

  useEffect(() => {
    if (userName) localStorage.setItem('hp_user_name', userName);
  }, [userName]);

  return (
    <AppContext.Provider
      value={{
        userName,
        setUserName,
        sessionId,
        setSessionId,
        messages,
        setMessages,
        isLoading,
        setIsLoading,
        hogwartsHouse,
        setHogwartsHouse,
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
