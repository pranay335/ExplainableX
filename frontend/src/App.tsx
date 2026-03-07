import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { FileUpload } from '@/components/FileUpload';
import { ChatInterface } from '@/components/ChatInterface';
import { ReportView } from '@/components/ReportView';
import { ThemeProvider } from '@/components/theme-provider';
import { DataProvider, useData } from '@/context/DataContext';
import { ChatProvider } from '@/context/ChatContext';
import { Database, Rows3, Columns3, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function Dashboard() {
  const { isDataLoaded, fileName, rowCount, columns, warnings, fetchSchema } = useData();
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await fetchSchema();
      try {
        const res = await api.get('/api/data/preview?limit=10');
        setPreview(res.data.rows || []);
      } catch { }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isDataLoaded) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome to DataWhisper</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Your AI-powered data intelligence platform with RAG-grounded analysis.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">1. Upload Data</h3>
            <p className="text-sm text-slate-500">Upload CSV or JSON. Data is cleaned, typed, and stored in PostgreSQL.</p>
          </div>
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">2. Ask Questions</h3>
            <p className="text-sm text-slate-500">AI answers strictly from your data — zero hallucinations.</p>
          </div>
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">3. Get Insights</h3>
            <p className="text-sm text-slate-500">Visualizations and reports grounded in your dataset.</p>
          </div>
        </div>

        <Link
          to="/upload"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          Upload Dataset <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // ---- Data is loaded → show stats dashboard ----
  const totalNulls = columns.reduce((sum, c) => sum + c.nullCount, 0);
  const totalCells = rowCount * columns.length;
  const qualityScore = totalCells > 0 ? Math.round(((totalCells - totalNulls) / totalCells) * 100) : 100;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Dataset Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Analyzing <span className="font-medium text-indigo-600 dark:text-indigo-400">{fileName}</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <Rows3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Rows</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{rowCount.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <Columns3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Columns</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{columns.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Data Quality</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{qualityScore}%</p>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Storage</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">Supabase PG</p>
          <p className="text-xs text-emerald-500">● Connected</p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pipeline Warnings</h3>
          </div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700 dark:text-amber-400">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Column Stats Table */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Column Analysis</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900">
                <th className="text-left px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Column</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Type</th>
                <th className="text-right px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Nulls</th>
                <th className="text-right px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Unique</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500 dark:text-slate-400">Range / Samples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {columns.map((col) => (
                <tr key={col.safeName} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{col.originalName}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${col.sqlType === 'INTEGER' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      col.sqlType === 'REAL' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                      {col.sqlType}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300">
                    {col.nullCount > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">{col.nullCount}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300">{col.uniqueCount}</td>
                  <td className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs">
                    {col.min !== undefined ? (
                      <span>{col.min} — {col.max}</span>
                    ) : (
                      <span>{col.sampleValues?.slice(0, 3).join(', ')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Preview */}
      {preview.length > 0 && (
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Preview</h2>
            <p className="text-xs text-slate-400 mt-1">First {preview.length} rows</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key} className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                        {val === null ? <span className="text-slate-300 dark:text-slate-600 italic">null</span> : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link
          to="/chat"
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          Ask Questions <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/upload"
          className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Upload New Dataset
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="datawhisper-theme">
      <DataProvider>
        <ChatProvider>
          <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Topbar />
              <main className="flex-1 overflow-y-auto p-6">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/upload" element={<FileUpload />} />
                  <Route path="/chat" element={<ChatInterface />} />
                  <Route path="/reports" element={<ReportView />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </ChatProvider>
      </DataProvider>
    </ThemeProvider>
  );
}
