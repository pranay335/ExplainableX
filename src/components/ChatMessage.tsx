import React from 'react';
import { Message } from '@/context/ChatContext';
import { Bot, User, Terminal, Table as TableIcon, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Editor from '@monaco-editor/react';
import { VisualizationRenderer } from './VisualizationRenderer';
import { cn } from '@/lib/utils';

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [showSql, setShowSql] = React.useState(false);

  return (
    <div className={cn("flex gap-4 p-6", isUser ? "bg-white dark:bg-slate-950" : "bg-slate-50 dark:bg-slate-900/50")}>
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        isUser ? "bg-slate-200 dark:bg-slate-800 text-slate-600" : "bg-indigo-600 text-white"
      )}>
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="prose dark:prose-invert max-w-none text-sm">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {message.sql && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <button 
              onClick={() => setShowSql(!showSql)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <Terminal className="h-3 w-3" />
              {showSql ? 'Hide SQL Query' : 'View SQL Query'}
            </button>
            
            {showSql && (
              <div className="h-32">
                <Editor
                  height="100%"
                  defaultLanguage="sql"
                  defaultValue={message.sql}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                    lineNumbers: 'off',
                    folding: false,
                    theme: 'vs-dark' // You might want to toggle this based on app theme
                  }}
                />
              </div>
            )}
          </div>
        )}

        {message.type === 'visualization' && message.data && message.visualizationConfig && (
          <div className="mt-4">
            <VisualizationRenderer 
              type={message.visualizationConfig.type}
              data={message.data}
              config={message.visualizationConfig}
            />
          </div>
        )}

        {message.type === 'query' && message.data && message.data.length > 0 && (
          <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Result Data</span>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 sticky top-0">
                  <tr>
                    {Object.keys(message.data[0]).map((key) => (
                      <th key={key} className="px-6 py-3 font-medium whitespace-nowrap">
                        {key.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {message.data.map((row, i) => (
                    <tr key={i} className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-6 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
