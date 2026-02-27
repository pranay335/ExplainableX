import React, { useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { ChatMessage } from './ChatMessage';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';

export function ChatInterface() {
  const { messages, sendMessage, isLoading } = useChat();
  const { isDataLoaded } = useData();
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  if (!isDataLoaded) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <Sparkles className="h-12 w-12 mb-4 text-slate-300 dark:text-slate-700" />
        <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">No Data Connected</h3>
        <p className="max-w-md mt-2">Please upload a dataset from the "Data Source" tab to start analyzing.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
            <Sparkles className="h-12 w-12 mb-4 text-indigo-400" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">AI Analyst Ready</h3>
            <p className="max-w-md mt-2 text-center">
              Ask questions about your data in plain English. I can generate SQL, run queries, and create visualizations.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-8 w-full max-w-lg">
              {['Show me the top 5 rows', 'Count records by category', 'Visualize sales over time', 'What is the average price?'].map((suggestion) => (
                <button 
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="p-3 text-sm text-left bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors border border-slate-100 dark:border-slate-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your data..."
            className="w-full pl-4 pr-12 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400">AI can make mistakes. Double check important info.</span>
        </div>
      </div>
    </div>
  );
}
