import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

export type AppContextType = {
  userName: string;
  setUserName: (name: string) => void;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  hogwartsHouse: string;
  setHogwartsHouse: (house: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userName, setUserName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hogwartsHouse, setHogwartsHouse] = useState<string>('');

  return (
    <AppContext.Provider
      value={{
        userName,
        setUserName,
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
