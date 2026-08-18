import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Car,
  Wrench,
  Plus,
  IndianRupee,
  CreditCard,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CreateVehicleModal } from '../vehicles/CreateVehicleModal';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return res.data.customer;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-surface-500">Customer not found</p>
        <Link to="/customers" className="mt-4 inline-block text-primary-600 text-sm font-semibold">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Top Header Nav */}
      <div className="px-4 py-4 md:px-8 border-b border-surface-200 bg-white flex items-center gap-3">
        <Link
          to="/customers"
          className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-surface-900">{data.name}</h1>
          <p className="text-xs text-surface-500">Customer Profile</p>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        {/* Contact Info Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 md:p-6 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xl font-bold shadow-sm">
                {data.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-surface-900">{data.name}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-surface-600 mt-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone size={16} className="text-primary-600" />
                    {data.phone}
                  </span>
                  {data.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail size={16} className="text-surface-400" />
                      {data.email}
                    </span>
                  )}
                  {data.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-surface-400" />
                      {data.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {data.notes && (
            <div className="mt-4 pt-3 border-t border-surface-100 text-xs text-surface-500">
              <span className="font-semibold text-surface-700">Notes:</span> {data.notes}
            </div>
          )}
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-card">
            <div className="flex items-center justify-between text-surface-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Billed</span>
              <IndianRupee size={18} className="text-surface-400" />
            </div>
            <p className="text-xl font-bold text-surface-900">
              ₹{data.totalBilled?.toLocaleString('en-IN') ?? 0}
            </p>
            <p className="text-xs text-surface-400 mt-1">{data.totalJobs} total jobs</p>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-card">
            <div className="flex items-center justify-between text-success-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Total Paid</span>
              <CheckCircle2 size={18} />
            </div>
            <p className="text-xl font-bold text-success-600">
              ₹{data.totalPaid?.toLocaleString('en-IN') ?? 0}
            </p>
            <p className="text-xs text-surface-400 mt-1">Confirmed payments</p>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-card">
            <div className="flex items-center justify-between text-danger-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Outstanding Credit</span>
              <CreditCard size={18} />
            </div>
            <p className="text-xl font-bold text-danger-600">
              ₹{data.outstanding?.toLocaleString('en-IN') ?? 0}
            </p>
            <p className="text-xs text-surface-400 mt-1">Pending payment</p>
          </div>
        </div>

        {/* Vehicles Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
              <Car size={20} className="text-primary-600" />
              Vehicles ({data.vehicles?.length ?? 0})
            </h3>
            <button
              onClick={() => setIsAddVehicleOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors"
            >
              <Plus size={16} />
              Add Vehicle
            </button>
          </div>

          {data.vehicles?.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 p-6 text-center">
              <Car size={32} className="text-surface-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-surface-600">No vehicles registered</p>
              <p className="text-xs text-surface-400 mt-1">Add a vehicle to start creating job cards</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.vehicles?.map((vehicle: any) => (
                <Link
                  key={vehicle.id}
                  to={`/vehicles/${vehicle.id}`}
                  className="bg-white rounded-xl border border-surface-200 p-4 shadow-card hover:border-primary-300 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-100 text-surface-700 flex items-center justify-center font-bold">
                      <Car size={20} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-surface-900 tracking-wide font-mono bg-surface-100 px-2 py-0.5 rounded">
                        {vehicle.registrationNumber}
                      </span>
                      <p className="text-xs text-surface-600 font-medium mt-1">
                        {vehicle.make} {vehicle.model} {vehicle.variant ? `· ${vehicle.variant}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-surface-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs Section */}
        <div>
          <h3 className="text-base font-bold text-surface-900 mb-3 flex items-center gap-2">
            <Wrench size={20} className="text-primary-600" />
            Recent Service Jobs
          </h3>

          {data.recentJobs?.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 p-6 text-center">
              <Clock size={32} className="text-surface-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-surface-600">No service history yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100 overflow-hidden">
              {data.recentJobs?.map((job: any) => (
                <div key={job.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                        {job.jobNumber}
                      </span>
                      <span className="text-xs text-surface-500 font-medium">
                        {job.registrationNumber} ({job.model})
                      </span>
                    </div>
                    <p className="text-sm text-surface-900 font-medium mt-1">
                      {job.complaint || 'General Service'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-surface-900">
                      ₹{job.actualTotal ? Number(job.actualTotal).toLocaleString('en-IN') : '0'}
                    </span>
                    <p className="text-xs font-semibold text-warning-600 mt-0.5 uppercase tracking-wider">
                      {job.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {id && (
        <CreateVehicleModal
          isOpen={isAddVehicleOpen}
          customerId={id}
          customerName={data.name}
          onClose={() => setIsAddVehicleOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
