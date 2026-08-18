import { useState, type FormEvent } from 'react';
import { X, Car, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CreateVehicleModalProps {
  isOpen: boolean;
  customerId: string;
  customerName?: string;
  onClose: () => void;
  onSuccess: (vehicle: any) => void;
}

export function CreateVehicleModal({
  isOpen,
  customerId,
  customerName,
  onClose,
  onSuccess,
}: CreateVehicleModalProps) {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [year, setYear] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.post('/vehicles', {
        customerId,
        registrationNumber: registrationNumber.toUpperCase().trim(),
        make,
        model,
        variant: variant || undefined,
        year: year || undefined,
        fuelType: fuelType || undefined,
        currentOdometer: currentOdometer || undefined,
        notes: notes || undefined,
      });

      toast.success('Vehicle registered successfully');
      onSuccess(res.data.vehicle);
      onClose();
      // Reset form
      setRegistrationNumber('');
      setMake('');
      setModel('');
      setVariant('');
      setYear('');
      setCurrentOdometer('');
      setNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add vehicle');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-xs p-0 md:p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-float max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Car size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Add Vehicle</h2>
              {customerName && (
                <p className="text-xs text-surface-500">For {customerName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
              Registration Number *
            </label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. AS01AB1234"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm uppercase tracking-wider font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Make (Brand) *
              </label>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Maruti, Hyundai"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Model *
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Swift, i20"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Variant
              </label>
              <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="VXi, Asta"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Year
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2022"
                maxLength={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                Fuel Type
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="EV">EV</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
              Current Odometer (km)
            </label>
            <input
              type="text"
              value={currentOdometer}
              onChange={(e) => setCurrentOdometer(e.target.value)}
              placeholder="e.g. 45200"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
              Vehicle Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scratches on rear bumper, alloy wheels..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-surface-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-surface-600 hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Save Vehicle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
