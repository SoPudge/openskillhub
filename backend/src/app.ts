import 'dotenv/config';
import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from './lib/prisma.js';
import { skillRoutes } from './routes/skills.js';
import { versionRoutes } from './routes/versions.js';
import { packageRoutes } from './routes/packages.js';
import { categoryRoutes } from './routes/categories.js';
import { authRoutes } from './routes/auth.js';
import { teamRoutes } from './routes/teams.js';
import { statsRoutes } from './routes/stats.js';

import { AppError, mapPrismaError, ErrorCode } from './lib/errors.js';

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

// ─── Log Directory ──────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = process.env.LOG_DIR || resolve(__dirname, '../../logs');

// Build pino transport targets
const transportTargets: Array<{
  target: string;
  options: Record<string, unknown>;
  level: string;
}> = [
  // File target: daily rotation
  {
    target: 'pino-roll',
    options: {
      file: resolve(LOG_DIR, 'app'),
      frequency: 'daily',
      dateFormat: 'yyyy-MM-dd',
      mkdir: true,
    },
    level: LOG_LEVEL,
  },
];

if (!IS_PRODUCTION) {
  // Development: also pretty-print to console
  transportTargets.push({
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
    level: LOG_LEVEL,
  });
}

const app = Fastify({
  logger: {
    level: LOG_LEVEL,
    transport: { targets: transportTargets },
    ...(IS_PRODUCTION
      ? {
          redact: {
            paths: ['req.headers.authorization', 'req.headers["x-api-key"]'],
            censor: '[REDACTED]',
          },
        }
      : {}),
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
app.setErrorHandler((error: FastifyError | AppError | Error, request, reply) => {
  // AppError: known business errors
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      request.log.error({ err: error, code: error.code, reqId: request.id }, error.message);
    } else {
      request.log.warn({ statusCode: error.statusCode, code: error.code, reqId: request.id }, error.message);
    }
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }

  // Prisma errors
  if ((error as any).code && (error as any).code.startsWith?.('P')) {
    const mapped = mapPrismaError(error as any);
    if (mapped) {
      request.log.warn({ statusCode: mapped.statusCode, code: mapped.code, reqId: request.id }, mapped.message);
      return reply.status(mapped.statusCode).send({ error: mapped.message, code: mapped.code });
    }
  }

  // Fastify/other errors
  const statusCode = (error as FastifyError).statusCode ?? 500;
  if (statusCode >= 500) {
    request.log.error({ err: error, reqId: request.id }, 'Unhandled server error');
  } else if (statusCode >= 400) {
    request.log.warn({ statusCode, error: error.message, reqId: request.id }, 'Client error');
  }
  reply.status(statusCode).send({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
    code: statusCode >= 500 ? ErrorCode.INTERNAL_ERROR : undefined,
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
