import type { FastifyInstance } from 'fastify';
import { createVehicleSchema, updateVehicleSchema, vehicleQuerySchema } from './schema';
import { getVehicles, createVehicle, getVehicleById, updateVehicle } from './service';
import { requireAuth } from '../../middleware/auth';

export async function vehicleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // List / Search Vehicles
  app.get('/api/vehicles', async (request, reply) => {
    const parsed = vehicleQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await getVehicles(
      parsed.data.search,
      parsed.data.customerId,
      parsed.data.limit,
      parsed.data.page
    );
    return reply.send(result);
  });

  // Create Vehicle
  app.post('/api/vehicles', async (request, reply) => {
    const parsed = createVehicleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const vehicle = await createVehicle(parsed.data);
    return reply.status(201).send({ success: true, vehicle });
  });

  // Get Vehicle Details & History
  app.get('/api/vehicles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const vehicle = await getVehicleById(id);

    if (!vehicle) {
      return reply.status(404).send({ error: 'Vehicle not found' });
    }

    return reply.send({ vehicle });
  });

  // Update Vehicle
  app.patch('/api/vehicles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateVehicleSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await updateVehicle(id, parsed.data);
    if (!updated) {
      return reply.status(404).send({ error: 'Vehicle not found' });
    }

    return reply.send({ success: true, vehicle: updated });
  });
}
