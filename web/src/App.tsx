import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CustomerListPage } from '@/pages/customers/CustomerListPage';
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage';
import { VehicleDetailPage } from '@/pages/vehicles/VehicleDetailPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />

              {/* Jobs */}
              <Route path="jobs" element={<PlaceholderPage title="Jobs" />} />
              <Route path="jobs/new" element={<PlaceholderPage title="New Job" />} />
              <Route path="jobs/:id" element={<PlaceholderPage title="Job Details" />} />

              {/* Customers */}
              <Route path="customers" element={<CustomerListPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />

              {/* Vehicles */}
              <Route path="vehicles/:id" element={<VehicleDetailPage />} />

              {/* Inventory */}
              <Route path="inventory" element={<PlaceholderPage title="Inventory" />} />
              <Route path="inventory/warehouse" element={<PlaceholderPage title="Warehouse Stock" />} />
              <Route path="inventory/shop" element={<PlaceholderPage title="Shop Stock" />} />
              <Route path="inventory/stock-in" element={<PlaceholderPage title="Add Stock" />} />
              <Route path="inventory/transfers" element={<PlaceholderPage title="Stock Transfers" />} />
              <Route path="inventory/transfers/new" element={<PlaceholderPage title="New Transfer" />} />
              <Route path="inventory/suppliers" element={<PlaceholderPage title="Suppliers" />} />

              {/* Billing */}
              <Route path="invoices" element={<PlaceholderPage title="Invoices" />} />
              <Route path="invoices/:id" element={<PlaceholderPage title="Invoice Details" />} />
              <Route path="payments" element={<PlaceholderPage title="Payments" />} />

              {/* Reports */}
              <Route path="reports" element={<PlaceholderPage title="Reports" />} />

              {/* Settings */}
              <Route path="settings" element={<PlaceholderPage title="Settings" />} />

              {/* More (mobile) */}
              <Route path="more" element={<PlaceholderPage title="More" />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          className: 'text-sm',
        }}
      />
    </QueryClientProvider>
  );
}
