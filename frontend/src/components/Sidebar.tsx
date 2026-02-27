import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Settings, Database, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Upload, label: 'Data Source', path: '/upload' },
    { icon: MessageSquare, label: 'Analyst Chat', path: '/chat' },
    { icon: FileText, label: 'Reports', path: '/reports' },
  ];

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Database className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">DataWhisper</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white cursor-pointer">
          <Settings className="h-5 w-5" />
          <span className="text-sm font-medium">Settings</span>
        </div>
      </div>
    </div>
  );
}
