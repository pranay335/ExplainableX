import { useTheme } from './theme-provider';
import { Sun, Moon, Bell, User } from 'lucide-react';
import { useData } from '@/context/DataContext';

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { fileName, isDataLoaded } = useData();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        {isDataLoaded && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-100 dark:border-emerald-800">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected: {fileName}
            </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
        
        <button className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <div className="h-8 w-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <User className="h-4 w-4" />
          </div>
          <span>Admin User</span>
        </button>
      </div>
    </header>
  );
}
