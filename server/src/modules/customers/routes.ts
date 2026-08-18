import type { FastifyInstance } from 'fastify';
import { createCustomerSchema, updateCustomerSchema, customerQuerySchema } from './schema';
import { getCustomers, createCustomer, getCustomerById, updateCustomer } from './service';
import { requireAuth } from '../../middleware/auth';

export async function customerRoutes(app: FastifyInstance) {
  // All customer routes require auth
  app.addHook('preHandler', requireAuth);

  // List / Search Customers
  app.get('/api/customers', async (request, reply) => {
    const parsed = customerQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid parameters', details: parsed.error.flatten() });
    }

    const result = await getCustomers(parsed.data.search, parsed.data.limit, parsed.data.page);
    return reply.send(result);
  });

  // Create Customer
  app.post('/api/customers', async (request, reply) => {
    const parsed = createCustomerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const customer = await createCustomer(parsed.data);
    return reply.status(201).send({ success: true, customer });
  });

  // Get Customer Details
  app.get('/api/customers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await getCustomerById(id);

    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    return reply.send({ customer });
  });

  // Update Customer
  app.patch('/api/customers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateCustomerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await updateCustomer(id, parsed.data);
    if (!updated) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    return reply.send({ success: true, customer: updated });
  });
}
