import React, { useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { ChatMessage } from './ChatMessage';
import { Send, Sparkles, Loader2, Command } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatInterface() {
  const { messages, sendMessage, isLoading } = useChat();
  const { isDataLoaded, columns } = useData();
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = React.useMemo(() => {
    if (!columns || columns.length === 0) {
      return [
        { text: 'Show me the top 5 rows', icon: '📊' },
        { text: 'Count records by category', icon: '🏷️' },
        { text: 'Visualize trends over time', icon: '📈' },
        { text: 'What is the average distribution?', icon: '⚖️' }
      ];
    }

    const numericCols = columns.filter(c => c.sqlType === 'INTEGER' || c.sqlType === 'REAL');
    const categoricalCols = columns.filter(c => c.sqlType === 'TEXT' && c.uniqueCount > 1 && c.uniqueCount < 50);

    const dynamic: { text: string; icon: string }[] = [];

    // 1. Basic Preview
    dynamic.push({ text: 'Show me the first 5 rows of data', icon: '📋' });

    // 2. Numeric Insight
    if (numericCols.length > 0) {
      const col = numericCols[0];
      dynamic.push({ text: `What is the average ${col.originalName}?`, icon: '🧮' });
    } else {
      dynamic.push({ text: 'Summarize the numerical trends', icon: '📈' });
    }

    // 3. Categorical Insight
    if (categoricalCols.length > 0) {
      const col = categoricalCols[0];
      dynamic.push({ text: `Group the data by ${col.originalName}`, icon: '🏷️' });
    } else {
      dynamic.push({ text: 'What are the main categories here?', icon: '🔍' });
    }

    // 4. General/AI
    dynamic.push({ text: 'Give me a brief executive summary', icon: '✨' });

    return dynamic;
  }, [columns]);

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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center"
      >
        <div className="h-20 w-20 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
          <Sparkles className="h-10 w-10 text-slate-300 dark:text-slate-700" />
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Data Connected</h3>
        <p className="max-w-xs mt-2 text-sm leading-relaxed text-slate-500">
          Upload a dataset from the dashboard or data source tab to start your RAG-powered analysis.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center text-slate-400 p-8"
          >
            <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">AI Data Analyst</h3>
            <p className="max-w-md mt-3 text-center text-slate-500 dark:text-slate-400 leading-relaxed">
              Ask questions about your data in plain English. Results are strictly grounded in your dataset.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 w-full max-w-xl">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.text}
                  onClick={() => sendMessage(suggestion.text)}
                  className="group p-4 text-sm text-left bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl transition-all border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-md active:scale-95"
                >
                  <span className="mr-2 opacity-50 group-hover:opacity-100 transition-opacity">{suggestion.icon}</span>
                  {suggestion.text}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-px" />
          </div>
        )}
      </div>

      <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/50">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Command className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your data..."
            className="w-full pl-12 pr-14 py-4.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-inner"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 top-2.5 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-90"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grounded AI Analysis • Zero Hallucinations</span>
        </div>
      </div>
    </div>
  );
}

