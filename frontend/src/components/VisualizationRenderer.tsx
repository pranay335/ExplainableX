import React, { useId } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface VisualizationRendererProps {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  data: any[];
  config: {
    xAxis: string;
    yAxis: string | string[];
    title?: string;
  };
  forceType?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function VisualizationRenderer({ type, data, config, forceType }: VisualizationRendererProps) {
  const chartId = useId().replace(/:/g, ''); // Unique ID for SVG definitions

  if (!data || data.length === 0) return <div className="text-slate-400 text-sm p-4">No data to visualize</div>;

  const activeType = forceType || type;

  // Sanitize data: Ensure yAxis values are numeric
  const sanitizedData = data.map(item => {
    const newItem = { ...item };
    const yKeys = Array.isArray(config.yAxis) ? config.yAxis : [config.yAxis];
    yKeys.forEach(key => {
      const val = newItem[key];
      if (typeof val === 'string') {
        const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ""));
        newItem[key] = isNaN(parsed) ? 0 : parsed;
      } else if (val === null || val === undefined) {
        newItem[key] = 0;
      }
    });
    return newItem;
  });

  const renderChart = () => {
    const chartDefs = (
      <defs>
        {COLORS.map((color, i) => [
          <linearGradient key={`grad-bar-${i}`} id={`grad-bar-${chartId}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>,
          <linearGradient key={`grad-area-${i}`} id={`grad-area-${chartId}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>,
          <filter key={`shadow-${i}`} id={`shadow-${chartId}-${i}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
          </filter>
        ]).flat()}
      </defs>
    );

    const commonTooltip = (
      <Tooltip
        contentStyle={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '16px',
          border: '1px solid rgba(226, 232, 240, 0.5)',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          backdropFilter: 'blur(12px)',
          padding: '12px 16px'
        }}
        itemStyle={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}
        labelStyle={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        cursor={{ fill: 'rgba(248, 250, 252, 0.8)', radius: 8 }}
      />
    );

    const commonGrid = <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />;

    switch (activeType) {
      case 'bar':
        return (
          <BarChart data={sanitizedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {chartDefs}
            {commonGrid}
            <XAxis
              dataKey={config.xAxis}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontWeight: 500 }}
              padding={{ left: 24, right: 24 }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontWeight: 500 }}
              width={40}
            />
            {commonTooltip}
            {Array.isArray(config.yAxis) ? (
              config.yAxis.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={`url(#grad-bar-${chartId}-${index % COLORS.length})`}
                  radius={[8, 8, 2, 2]}
                  animationDuration={1500}
                  barSize={sanitizedData.length === 1 ? 80 : undefined}
                  style={{ filter: `url(#shadow-${chartId}-${index % COLORS.length})` }}
                />
              ))
            ) : (
              <Bar
                dataKey={config.yAxis}
                fill={`url(#grad-bar-${chartId}-0)`}
                radius={[8, 8, 2, 2]}
                animationDuration={1500}
                barSize={sanitizedData.length === 1 ? 80 : undefined}
                style={{ filter: `url(#shadow-${chartId}-0)` }}
              />
            )}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={sanitizedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {chartDefs}
            {commonGrid}
            <XAxis dataKey={config.xAxis} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 500 }} padding={{ left: 24, right: 24 }} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 500 }} width={40} />
            {commonTooltip}
            <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
            {Array.isArray(config.yAxis) ? (
              config.yAxis.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={4}
                  dot={{ r: 5, fill: '#fff', strokeWidth: 3, stroke: COLORS[index % COLORS.length] }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={config.yAxis}
                stroke={COLORS[0]}
                strokeWidth={4}
                dot={{ r: 5, fill: '#fff', strokeWidth: 3, stroke: COLORS[0] }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                animationDuration={1500}
              />
            )}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={sanitizedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {chartDefs}
            {commonGrid}
            <XAxis dataKey={config.xAxis} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 500 }} padding={{ left: 24, right: 24 }} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 500 }} width={40} />
            {commonTooltip}
            {Array.isArray(config.yAxis) ? (
              config.yAxis.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={`url(#grad-area-${chartId}-${index % COLORS.length})`}
                  strokeWidth={3}
                  animationDuration={1500}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={config.yAxis}
                stroke={COLORS[0]}
                fill={`url(#grad-area-${chartId}-0)`}
                strokeWidth={3}
                animationDuration={1500}
              />
            )}
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            {chartDefs}
            <Pie
              data={sanitizedData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={8}
              dataKey={Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis}
              nameKey={config.xAxis}
              animationDuration={1500}
              stroke="none"
            >
              {sanitizedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#grad-bar-${chartId}-${index % COLORS.length})`}
                  style={{ filter: `url(#shadow-${chartId}-${index % COLORS.length})` }}
                />
              ))}
            </Pie>
            {commonTooltip}
            <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
          </PieChart>
        );
      default:
        return <div className="flex items-center justify-center h-full text-slate-400">Unsupported chart type: {activeType}</div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full h-[400px] bg-white dark:bg-slate-900/40 rounded-[32px] p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-slate-200/20 dark:shadow-none backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          {config.title && (
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              {config.title}
            </h4>
          )}
          <p className="text-[10px] font-medium text-slate-400">Ground truth analysis powered by ExplainableX AI</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700/50">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{activeType}</span>
          <span className="text-[10px] font-bold text-slate-300">•</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{sanitizedData.length} records</span>
        </div>
      </div>
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

