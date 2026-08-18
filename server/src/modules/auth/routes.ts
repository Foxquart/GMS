import type { FastifyInstance } from 'fastify';
import { loginSchema } from './schema';
import { loginUser, getUserById } from './service';
import { verifyToken } from './jwt';

export async function authRoutes(app: FastifyInstance) {
  // Login
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await loginUser(parsed.data);

      reply
        .setCookie('token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        })
        .send({
          success: true,
          user: result.user,
        });
    } catch (err: any) {
      return reply.status(401).send({ error: err.message });
    }
  });

  // Logout
  app.post('/api/auth/logout', async (_request, reply) => {
    reply
      .clearCookie('token', { path: '/' })
      .send({ success: true });
  });

  // Get current user
  app.get('/api/auth/me', async (request, reply) => {
    const token = request.cookies.token;
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    try {
      const payload = verifyToken(token);
      const user = await getUserById(payload.userId);
      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }
      return reply.send({ user });
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
}
