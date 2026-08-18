import { z } from 'zod';

export const createVehicleSchema = z.object({
  customerId: z.string().uuid('Valid customer ID is required'),
  registrationNumber: z.string().min(1, 'Registration number is required').toUpperCase(),
  make: z.string().min(1, 'Make (brand) is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  year: z.string().max(4).optional(),
  fuelType: z.string().optional(),
  vin: z.string().optional(),
  currentOdometer: z.string().optional(),
  notes: z.string().optional(),
});

export const updateVehicleSchema = createVehicleSchema.omit({ customerId: true }).partial();

export const vehicleQuerySchema = z.object({
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
