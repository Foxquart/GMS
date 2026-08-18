import {
  Wrench,
  Users,
  Package,
  AlertTriangle,
  TrendingUp,
  IndianRupee,
  CreditCard,
  Plus,
  ArrowLeftRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Placeholder data — will be replaced with real API data
const summaryCards = [
  {
    label: "Today's Revenue",
    value: '₹0',
    icon: IndianRupee,
    color: 'text-success-600',
    bg: 'bg-success-50',
  },
  {
    label: 'Active Jobs',
    value: '0',
    icon: Wrench,
    color: 'text-warning-600',
    bg: 'bg-warning-50',
  },
  {
    label: 'Outstanding Credit',
    value: '₹0',
    icon: CreditCard,
    color: 'text-danger-600',
    bg: 'bg-danger-50',
  },
  {
    label: 'Low Stock Parts',
    value: '0',
    icon: AlertTriangle,
    color: 'text-warning-600',
    bg: 'bg-warning-50',
  },
];

const quickActions = [
  { label: 'New Job', icon: Plus, to: '/jobs/new', primary: true },
  { label: 'New Customer', icon: Users, to: '/customers/new', primary: false },
  { label: 'Add Stock', icon: Package, to: '/inventory/stock-in', primary: false },
  { label: 'Transfer', icon: ArrowLeftRight, to: '/inventory/transfers/new', primary: false },
];

export function DashboardPage() {
  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="px-4 py-5 md:px-8 md:py-6">
        <h1 className="text-xl md:text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-sm text-surface-500 mt-0.5">Welcome back! Here's your shop overview.</p>
      </div>

      {/* Summary Cards */}
      <div className="px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.bg)}>
                <card.icon size={20} className={card.color} />
              </div>
              <TrendingUp size={16} className="text-surface-300" />
            </div>
            <p className="text-lg md:text-xl font-bold text-surface-900">{card.value}</p>
            <p className="text-xs text-surface-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="px-4 md:px-8 mt-6">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-sm',
                'transition-all duration-200 active:scale-[0.97]',
                action.primary
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-sm hover:shadow-md'
                  : 'bg-white text-surface-700 border border-surface-200 hover:bg-surface-50 hover:border-surface-300'
              )}
            >
              <action.icon size={18} />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Active Jobs (Empty State) */}
      <div className="px-4 md:px-8 mt-6">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">Active Jobs</h2>
        <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
            <Wrench size={24} className="text-surface-400" />
          </div>
          <p className="text-sm font-medium text-surface-600">No active jobs</p>
          <p className="text-xs text-surface-400 mt-1">Create your first job to get started</p>
          <Link
            to="/jobs/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />
            New Job
          </Link>
        </div>
      </div>

      {/* Low Stock (Empty State) */}
      <div className="px-4 md:px-8 mt-6 mb-6">
        <h2 className="text-sm font-semibold text-surface-700 mb-3">Low Shop Stock</h2>
        <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-3">
            <Package size={24} className="text-success-500" />
          </div>
          <p className="text-sm font-medium text-surface-600">All stock levels healthy</p>
          <p className="text-xs text-surface-400 mt-1">No parts are below minimum threshold</p>
        </div>
      </div>
    </div>
  );
}
