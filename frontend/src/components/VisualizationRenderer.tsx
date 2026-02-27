import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';

interface VisualizationRendererProps {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  data: any[];
  config: {
    xAxis: string;
    yAxis: string | string[];
    title?: string;
  };
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function VisualizationRenderer({ type, data, config }: VisualizationRendererProps) {
  if (!data || data.length === 0) return <div className="text-slate-400 text-sm p-4">No data to visualize</div>;

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey={config.xAxis} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
            />
            <Legend />
            {Array.isArray(config.yAxis) ? (
              config.yAxis.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))
            ) : (
              <Bar dataKey={config.yAxis} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey={config.xAxis} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            {Array.isArray(config.yAxis) ? (
              config.yAxis.map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={false} />
              ))
            ) : (
              <Line type="monotone" dataKey={config.yAxis} stroke={COLORS[0]} strokeWidth={2} dot={false} />
            )}
          </LineChart>
        );
      case 'area':
        return (
            <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey={config.xAxis} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            {Array.isArray(config.yAxis) ? (
                config.yAxis.map((key, index) => (
                <Area key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.3} />
                ))
            ) : (
                <Area type="monotone" dataKey={config.yAxis} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
            )}
            </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis}
              nameKey={config.xAxis}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-[300px] bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
      {config.title && <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 text-center">{config.title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        {renderChart() || <div>Unsupported chart type</div>}
      </ResponsiveContainer>
    </div>
  );
}
