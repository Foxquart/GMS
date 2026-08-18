import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  Package,
  Users,
  FileText,
  BarChart3,
  Settings,
  Warehouse,
  ArrowLeftRight,
  CreditCard,
  Truck,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs', icon: Wrench, label: 'Jobs' },
  { to: '/customers', icon: Users, label: 'Customers' },
];

const inventoryNav = [
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/inventory/warehouse', icon: Warehouse, label: 'Warehouse' },
  { to: '/inventory/shop', icon: Package, label: 'Shop Stock' },
  { to: '/inventory/transfers', icon: ArrowLeftRight, label: 'Transfers' },
  { to: '/inventory/suppliers', icon: Truck, label: 'Suppliers' },
];

const billingNav = [
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
];

const otherNav = [
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function SidebarSection({
  title,
  items,
}: {
  title?: string;
  items: typeof mainNav;
}) {
  return (
    <div className="mb-2">
      {title && (
        <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          {title}
        </p>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium',
                  'transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                )
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const { logout, user } = useAuthStore();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-surface-200">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 h-16 px-5 border-b border-surface-200">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
          <Wrench size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-surface-900 leading-tight">Garage Manager</h1>
          <p className="text-[11px] text-surface-400">Workshop System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <SidebarSection items={mainNav} />
        <SidebarSection title="Inventory" items={inventoryNav} />
        <SidebarSection title="Billing" items={billingNav} />
        <SidebarSection title="Other" items={otherNav} />
      </nav>

      {/* User / Logout */}
      <div className="border-t border-surface-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary-700">
              {user?.name?.charAt(0) ?? 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-surface-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
