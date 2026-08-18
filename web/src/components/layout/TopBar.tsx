import { Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export function TopBar() {
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200 md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">GM</span>
          </div>
          <span className="text-base font-bold text-surface-900">Garage Manager</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors">
            <Bell size={20} />
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-700">
              {user?.name?.charAt(0) ?? 'A'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
