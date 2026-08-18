import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CreateCustomerModal } from './CreateCustomerModal';

export function CustomerListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: async () => {
      const res = await api.get('/customers', {
        params: { search: search || undefined, page, limit: 15 },
      });
      return res.data;
    },
  });

  const customers = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div className="px-4 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-surface-900 flex items-center gap-2.5">
            <Users className="text-primary-600" size={26} />
            Customers
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Manage your garage client directory and history
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <Plus size={18} />
          New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 md:px-8 mb-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by customer name or phone number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="px-4 md:px-8 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && customers.length === 0 && (
        <div className="px-4 md:px-8">
          <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center my-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <UserPlus size={28} />
            </div>
            <h3 className="text-base font-bold text-surface-900">No customers found</h3>
            <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">
              {search
                ? `No customers matched "${search}". Try searching with a different name or phone.`
                : 'Get started by creating your first customer profile.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              <Plus size={18} />
              Add Customer
            </button>
          </div>
        </div>
      )}

      {/* Mobile Card List */}
      {!isLoading && customers.length > 0 && (
        <div className="px-4 md:hidden space-y-3">
          {customers.map((customer: any) => (
            <Link
              key={customer.id}
              to={`/customers/${customer.id}`}
              className="block bg-white rounded-xl border border-surface-200 p-4 shadow-card hover:border-primary-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-900">{customer.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-surface-500 mt-0.5">
                      <Phone size={12} />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-surface-400" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && customers.length > 0 && (
        <div className="hidden md:block px-8">
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-50 border-b border-surface-200 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Address</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {customers.map((customer: any) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-surface-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            to={`/customers/${customer.id}`}
                            className="font-semibold text-surface-900 hover:text-primary-600 transition-colors"
                          >
                            {customer.name}
                          </Link>
                          {customer.notes && (
                            <p className="text-xs text-surface-400 truncate max-w-xs">{customer.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-surface-600 font-medium">{customer.phone}</td>
                    <td className="px-6 py-4 text-surface-500">
                      {customer.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail size={14} className="text-surface-400" />
                          {customer.email}
                        </span>
                      ) : (
                        <span className="text-surface-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-surface-500 truncate max-w-xs">
                      {customer.address || <span className="text-surface-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                      >
                        View Profile
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {meta && meta.totalPages > 1 && (
        <div className="px-4 md:px-8 mt-5 flex items-center justify-between">
          <p className="text-xs text-surface-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-surface-200 text-xs font-medium bg-white disabled:opacity-50 hover:bg-surface-50 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-surface-200 text-xs font-medium bg-white disabled:opacity-50 hover:bg-surface-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
