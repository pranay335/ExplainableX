import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useData } from './DataContext';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'query' | 'visualization';
  sql?: string;
  data?: any[];
  visualizationConfig?: any;
  grounded?: boolean;
  timestamp: Date;
}

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { schema, fileName } = useData();

  // Clear chat whenever a new file is uploaded
  useEffect(() => {
    setMessages([]);
  }, [fileName]);

  const sendMessage = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await axios.post('/api/chat', {
        message: text,
        schema: schema,
        history: history
      });

      const aiData = response.data;

      let queryResults: any[] = [];
      if (aiData.sql) {
        try {
          const sqlRes = await axios.post('/api/query', { sql: aiData.sql });
          queryResults = sqlRes.data.results;
        } catch (e) {
          console.error("SQL Execution failed", e);
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiData.text,
        type: aiData.type,
        sql: aiData.sql,
        visualizationConfig: aiData.visualization,
        data: queryResults,
        grounded: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);

    } catch (error) {
      console.error("Chat error", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request.",
        type: 'text',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <ChatContext.Provider value={{ messages, isLoading, sendMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};
