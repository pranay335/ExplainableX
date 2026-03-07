import React from 'react';
import { Message } from '@/context/ChatContext';
import {
  Bot, User, Terminal, Table as TableIcon,
  BarChart3, LineChart, PieChart, AreaChart,
  MessageSquare, LayoutDashboard, ChevronDown, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Editor from '@monaco-editor/react';
import { VisualizationRenderer } from './VisualizationRenderer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [showSql, setShowSql] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'text' | 'table' | 'chart'>(
    message.type === 'visualization' ? 'chart' : (message.type === 'query' ? 'table' : 'text')
  );
  const [chartType, setChartType] = React.useState<string>(message.visualizationConfig?.type || 'bar');
  const [isChartMenuOpen, setIsChartMenuOpen] = React.useState(false);

  const hasData = message.data && message.data.length > 0;

  const chartTypes = [
    { id: 'bar', icon: BarChart3, label: 'Bar Chart' },
    { id: 'line', icon: LineChart, label: 'Line Chart' },
    { id: 'area', icon: AreaChart, label: 'Area Chart' },
    { id: 'pie', icon: PieChart, label: 'Pie Chart' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("flex gap-4 p-6 transition-colors", isUser ? "bg-white dark:bg-slate-950" : "bg-slate-50/50 dark:bg-slate-900/30")}
    >
      <div className={cn(
        "h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
        isUser ? "bg-slate-100 dark:bg-slate-800 text-slate-600" : "bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none"
      )}>
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      <div className="flex-1 space-y-4 overflow-hidden">
        {/* Header / Tabs for AI messages with data */}
        {!isUser && hasData && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-sm">
              <button
                onClick={() => setActiveTab('text')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  activeTab === 'text' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Summary
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  activeTab === 'table' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <TableIcon className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                onClick={() => setActiveTab('chart')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  activeTab === 'chart' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Visualization
              </button>
            </div>

            {activeTab === 'chart' && (
              <div className="relative">
                <button
                  onClick={() => setIsChartMenuOpen(!isChartMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-300 transition-all shadow-sm"
                >
                  {React.createElement(chartTypes.find(t => t.id === chartType)?.icon || BarChart3, { className: "h-3.5 w-3.5 text-indigo-500" })}
                  {chartTypes.find(t => t.id === chartType)?.label}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", isChartMenuOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isChartMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsChartMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden"
                      >
                        {chartTypes.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => {
                              setChartType(type.id);
                              setIsChartMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <type.icon className="h-4 w-4 text-slate-400" />
                              {type.label}
                            </div>
                            {chartType === type.id && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[20px]">
          <AnimatePresence mode="wait">
            {activeTab === 'text' && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="prose dark:prose-invert max-w-none text-[15px] leading-relaxed"
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </motion.div>
            )}

            {activeTab === 'table' && hasData && (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900/50"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Dataset View • {message.data?.length} rows</span>
                </div>
                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-[11px] text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10">
                      <tr>
                        {Object.keys(message.data![0]).map((key) => (
                          <th key={key} className="px-6 py-3 font-bold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {message.data!.map((row, i) => (
                        <tr key={i} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-6 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 text-[13px]">
                              {val === null ? <span className="italic text-slate-300">null</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'chart' && hasData && (
              <motion.div
                key="chart"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                <VisualizationRenderer
                  type={message.visualizationConfig?.type || 'bar'}
                  data={message.data!}
                  config={message.visualizationConfig || { xAxis: '', yAxis: '' }}
                  forceType={chartType}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SQL Toggle */}
        {message.sql && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 shadow-sm border-l-4 border-l-indigo-500">
            <button
              onClick={() => setShowSql(!showSql)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all uppercase tracking-widest"
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5" />
                Query Metadata
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSql && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showSql && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 160, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Editor
                    height="160px"
                    defaultLanguage="sql"
                    defaultValue={message.sql}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 12,
                      lineNumbers: 'on',
                      padding: { top: 12, bottom: 12 },
                      folding: false,
                      wordWrap: 'on',
                      backgroundColor: '#0f172a'
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

