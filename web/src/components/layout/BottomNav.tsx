import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  Package,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/jobs', icon: Wrench, label: 'Jobs' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-surface-200 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 w-full h-full',
                'text-xs font-medium transition-colors duration-200',
                isActive
                  ? 'text-primary-600'
                  : 'text-surface-400 hover:text-surface-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="transition-all duration-200"
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
