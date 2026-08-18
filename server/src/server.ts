import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { authRoutes } from './modules/auth/routes';
import { customerRoutes } from './modules/customers/routes';
import { vehicleRoutes } from './modules/vehicles/routes';
import { authMiddleware } from './middleware/auth';
import { runMigrations } from './db/migrate';

async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Plugins ─────────────────────────────────────────────────────
  await app.register(cors, {
    origin: env.NODE_ENV === 'development' ? true : ['http://localhost:5173'],
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ─── Middleware ──────────────────────────────────────────────────
  await app.register(authMiddleware);

  // ─── Health Check ────────────────────────────────────────────────
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ─── Routes ──────────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(customerRoutes);
  await app.register(vehicleRoutes);

  // ─── Auth-rate-limited endpoints ─────────────────────────────────
  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.url?.startsWith('/api/auth/login')) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 10,
          timeWindow: '5 minutes',
        },
      };
    }
  });

  return app;
}

async function start() {
  // Ensure DB migrations run on server startup
  await runMigrations();

  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`\n🔧 Garage Management System API`);
    console.log(`   Running on http://${env.HOST}:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
