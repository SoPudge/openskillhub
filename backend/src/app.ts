import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './lib/prisma.js';
import { skillRoutes } from './routes/skills.js';
import { versionRoutes } from './routes/versions.js';
import { packageRoutes } from './routes/packages.js';
import { categoryRoutes } from './routes/categories.js';
import { authRoutes } from './routes/auth.js';
import { teamRoutes } from './routes/teams.js';
import { statsRoutes } from './routes/stats.js';

// ─── Startup Validation ─────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = Fastify({
  logger: {
    level: LOG_LEVEL,
    ...(IS_PRODUCTION
      ? {
          // Production: JSON to stdout, redact sensitive fields
          redact: {
            paths: ['req.headers.authorization', 'req.headers["x-api-key"]'],
            censor: '[REDACTED]',
          },
        }
      : {
          // Development: pretty print
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
          },
        }),
  },
  trustProxy: true,
  genReqId: () => crypto.randomUUID(),
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});

await app.register(multipart, {
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// ─── Rate Limiting ──────────────────────────────────────
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
});

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// ─── Global Error Handler ───────────────────────────────
app.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) {
    request.log.error({ err: error, reqId: request.id }, 'Unhandled server error');
  } else if (statusCode >= 400) {
    request.log.warn({ statusCode, error: error.message, reqId: request.id }, 'Client error');
  }
  reply.status(statusCode).send({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
  });
});

// API routes
await app.register(authRoutes, { prefix: '/api/v1/auth' });
await app.register(skillRoutes, { prefix: '/api/v1/skills' });
await app.register(versionRoutes, { prefix: '/api/v1/skills' });
await app.register(packageRoutes, { prefix: '/api/v1/skills' });
await app.register(categoryRoutes, { prefix: '/api/v1' });
await app.register(teamRoutes, { prefix: '/api/v1/teams' });
await app.register(statsRoutes, { prefix: '/api/v1/skills' });

const port = Number(process.env.SERVER_PORT) || 3001;
const host = process.env.SERVER_HOST || '0.0.0.0';

// ─── Graceful Shutdown ──────────────────────────────────
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutting down gracefully');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

try {
  await app.listen({ port, host });
  app.log.info(`Server running at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
