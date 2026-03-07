import React, { useEffect, useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { useData } from '@/context/DataContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Printer, FileText, Loader2, Database, Table, LayoutList, Heart, PieChart as PieChartIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

export function ReportView() {
    const { messages } = useChat();
    const { fileName, columns, rowCount } = useData();
    const [report, setReport] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        if (messages.length === 0) return;
        setLoading(true);
        try {
            const response = await axios.post('/api/report', { conversation: messages });
            setReport(response.data.report);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Simplified data for Pie Chart
    const typeMap = columns?.reduce((acc: any, col) => {
        let typeGroup = 'Other';
        const st = col.sqlType.toUpperCase();
        if (st.includes('INT') || st.includes('FLOAT') || st.includes('REAL') || st.includes('DECIMAL') || st.includes('NUME') || st.includes('DOUB')) {
            typeGroup = 'Numbers';
        } else if (st.includes('CHAR') || st.includes('TEXT')) {
            typeGroup = 'Text';
        } else if (st.includes('DATE') || st.includes('TIME')) {
            typeGroup = 'Dates & Times';
        } else if (st.includes('BOOL')) {
            typeGroup = 'True/False';
        }
        acc[typeGroup] = (acc[typeGroup] || 0) + 1;
        return acc;
    }, {});

    const typeData = Object.entries(typeMap || {}).map(([name, value]) => ({ name, value }));
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    // Overall Health
    const totalCells = (columns?.length || 0) * rowCount;
    const missingCells = columns?.reduce((sum, col) => sum + col.nullCount, 0) || 0;
    const healthPercent = totalCells > 0 ? Math.round(((totalCells - missingCells) / totalCells) * 100) : 100;

    // Missing Info
    const incompleteColumns = columns?.filter(col => col.nullCount > 0).map(col => ({
        name: col.originalName,
        missing: col.nullCount,
        percent: Math.round((col.nullCount / rowCount) * 100)
    })).sort((a, b) => b.missing - a.missing) || [];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analysis Report</h1>
                <div className="flex gap-2">
                    <button
                        onClick={generateReport}
                        disabled={loading || messages.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Generate Summary
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={!report && messages.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Printer className="h-4 w-4" />
                        Print
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:p-0">
                <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Data Analysis Report</h1>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>Source: {fileName || 'Unknown'}</span>
                        <span>•</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                {columns && columns.length > 0 && (
                    <div className="mb-10 space-y-6">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Database className="h-5 w-5 text-indigo-500" />
                            Dataset Overview
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                    <Table className="h-4 w-4" />
                                    <span className="text-sm font-medium">Total Records</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{rowCount.toLocaleString()}</div>
                                <div className="text-xs text-slate-400 mt-1">Rows of data</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                    <LayoutList className="h-4 w-4" />
                                    <span className="text-sm font-medium">Total Fields</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{columns.length}</div>
                                <div className="text-xs text-slate-400 mt-1">Pieces of information per record</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                    <Heart className="h-4 w-4" />
                                    <span className="text-sm font-medium">Data Health</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-2xl font-bold text-emerald-500">{healthPercent}%</div>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Information filled</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print:break-inside-avoid">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2 self-start">
                                    <PieChartIcon className="h-4 w-4 text-indigo-500" />
                                    Types of Information
                                </h4>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={typeData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {typeData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => [`${value} Fields`, 'Count']}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col print:break-inside-avoid">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                    Missing Information Check
                                </h4>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {incompleteColumns.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-8">
                                            <CheckCircle className="h-10 w-10 text-emerald-400 border-4 border-emerald-50 rounded-full mb-3" />
                                            <p className="font-medium text-emerald-600 dark:text-emerald-400">Perfect!</p>
                                            <p className="text-sm text-center mt-1">No missing information found in any field.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-sm text-slate-500 mb-4">The following fields are missing some information:</p>
                                            {incompleteColumns.map((col, idx) => (
                                                <div key={idx} className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate w-3/5">{col.name}</span>
                                                        <span className="text-slate-500 text-xs">{col.missing.toLocaleString()} missing ({col.percent}%)</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                                                        <div className="bg-rose-400 h-1.5 rounded-full" style={{ width: `${col.percent}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {report && (
                    <div className="mb-8 prose dark:prose-invert max-w-none bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                        <h3 className="text-indigo-900 dark:text-indigo-300 font-semibold mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Executive Summary
                        </h3>
                        <ReactMarkdown>{report}</ReactMarkdown>
                    </div>
                )}

                <div className="space-y-8">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Detailed Analysis Log</h3>
                    {messages.filter(m => m.role === 'assistant').map((msg, idx) => (
                        <div key={msg.id} className="border-l-2 border-slate-200 dark:border-slate-800 pl-4 py-2 break-inside-avoid">
                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Insight #{idx + 1}</div>
                            <div className="prose dark:prose-invert max-w-none text-sm">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.type === 'visualization' && (
                                <div className="mt-4 p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50 print:break-inside-avoid">
                                    <div className="text-xs text-center text-slate-400 mb-2">[Chart: {msg.visualizationConfig?.title || 'Visualization'}]</div>
                                    {/* Note: Charts might not print perfectly without specific CSS, but this is a start */}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                    Generated by DataWhisper AI Platform
                </div>
            </div>
        </div>
    );
}
