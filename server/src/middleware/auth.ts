import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, type JwtPayload } from '../modules/auth/jwt';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function authMiddleware(app: FastifyInstance) {
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies.token;
    if (!token) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const payload = verifyToken(token);
      request.user = payload;
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
}

// Hook that can be used as a preHandler on protected routes
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies.token;
  if (!token) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
