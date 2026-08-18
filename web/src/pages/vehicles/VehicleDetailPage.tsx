import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Car,
  User,
  Gauge,
  Calendar,
  Fuel,
  Wrench,
  Package,
  Plus,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const res = await api.get(`/vehicles/${id}`);
      return res.data.vehicle;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="skeleton h-60 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-surface-500">Vehicle not found</p>
        <Link to="/customers" className="mt-4 inline-block text-primary-600 text-sm font-semibold">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-4 py-4 md:px-8 border-b border-surface-200 bg-white flex items-center gap-3">
        <Link
          to={`/customers/${data.customerId}`}
          className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-surface-900 font-mono">
            {data.registrationNumber}
          </h1>
          <p className="text-xs text-surface-500">
            {data.make} {data.model} {data.variant ? `(${data.variant})` : ''}
          </p>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        {/* Vehicle Header Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 md:p-6 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-surface-900 text-white flex items-center justify-center font-bold">
                <Car size={28} />
              </div>
              <div>
                <span className="text-lg md:text-xl font-bold text-surface-900 font-mono tracking-wide bg-surface-100 px-3 py-1 rounded-lg">
                  {data.registrationNumber}
                </span>
                <p className="text-sm font-semibold text-surface-700 mt-2">
                  {data.make} {data.model} {data.variant || ''}
                </p>
              </div>
            </div>

            <Link
              to={`/jobs/new?vehicleId=${data.id}&customerId=${data.customerId}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus size={18} />
              Create Job Card
            </Link>
          </div>

          {/* Quick Specs Grid */}
          <div className="mt-5 pt-4 border-t border-surface-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-surface-400" />
              <div>
                <p className="text-surface-400 font-medium">Odometer</p>
                <p className="font-bold text-surface-900">
                  {data.currentOdometer ? `${Number(data.currentOdometer).toLocaleString()} km` : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Fuel size={16} className="text-surface-400" />
              <div>
                <p className="text-surface-400 font-medium">Fuel Type</p>
                <p className="font-bold text-surface-900">{data.fuelType || 'Petrol'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-surface-400" />
              <div>
                <p className="text-surface-400 font-medium">Year</p>
                <p className="font-bold text-surface-900">{data.year || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User size={16} className="text-surface-400" />
              <div>
                <p className="text-surface-400 font-medium">Owner</p>
                <Link
                  to={`/customers/${data.customerId}`}
                  className="font-bold text-primary-600 hover:underline"
                >
                  {data.customerName}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Service History Timeline */}
        <div>
          <h2 className="text-base font-bold text-surface-900 mb-4 flex items-center gap-2">
            <Wrench size={20} className="text-primary-600" />
            Service History Timeline ({data.serviceHistory?.length ?? 0})
          </h2>

          {data.serviceHistory?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-surface-200 p-8 text-center">
              <Clock size={36} className="text-surface-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-surface-700">No previous services recorded</p>
              <p className="text-xs text-surface-400 mt-1">
                Create a job card to start building service history
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.serviceHistory?.map((job: any) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-surface-200 p-5 shadow-card space-y-4"
                >
                  {/* Job Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg">
                        {job.jobNumber}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-warning-600 bg-warning-50 px-2 py-0.5 rounded">
                        {job.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-surface-500">
                      {job.odometerReading && (
                        <span className="flex items-center gap-1 font-mono">
                          <Gauge size={14} />
                          {Number(job.odometerReading).toLocaleString()} km
                        </span>
                      )}
                      <span>{new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Complaint & Notes */}
                  <div>
                    <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider">Complaint</h4>
                    <p className="text-sm font-medium text-surface-900 mt-0.5">
                      {job.complaint || 'General inspection & routine maintenance'}
                    </p>
                    {job.inspectionNotes && (
                      <p className="text-xs text-surface-500 mt-1">
                        <span className="font-semibold text-surface-700">Inspection:</span> {job.inspectionNotes}
                      </p>
                    )}
                  </div>

                  {/* Parts & Labour breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {/* Labour */}
                    {job.labourItems?.length > 0 && (
                      <div className="bg-surface-50 rounded-xl p-3 text-xs space-y-1.5">
                        <p className="font-bold text-surface-700 flex items-center gap-1">
                          <Wrench size={14} /> Labour Services
                        </p>
                        {job.labourItems.map((l: any) => (
                          <div key={l.id} className="flex justify-between text-surface-600">
                            <span>{l.description}</span>
                            <span className="font-semibold">₹{Number(l.amount).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Parts */}
                    {job.partsUsed?.length > 0 && (
                      <div className="bg-surface-50 rounded-xl p-3 text-xs space-y-1.5">
                        <p className="font-bold text-surface-700 flex items-center gap-1">
                          <Package size={14} /> Parts Used
                        </p>
                        {job.partsUsed.map((p: any) => (
                          <div key={p.id} className="flex justify-between text-surface-600">
                            <span>{p.partName} ({p.quantity}x)</span>
                            <span className="font-semibold">₹{Number(p.totalPrice).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="pt-2 flex items-center justify-between text-sm border-t border-surface-100">
                    <span className="text-xs font-semibold text-surface-500">Service Total</span>
                    <span className="text-base font-bold text-surface-900">
                      ₹{job.actualTotal ? Number(job.actualTotal).toLocaleString('en-IN') : '0'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
