import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { prisma } from './lib/prisma.js';
import { skillRoutes } from './routes/skills.js';
import { versionRoutes } from './routes/versions.js';
import { packageRoutes } from './routes/packages.js';
import { categoryRoutes } from './routes/categories.js';
import { authRoutes } from './routes/auth.js';

// ─── Startup Validation ─────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});

await app.register(multipart, {
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// API routes
await app.register(authRoutes, { prefix: '/api/v1/auth' });
await app.register(skillRoutes, { prefix: '/api/v1/skills' });
await app.register(versionRoutes, { prefix: '/api/v1/skills' });
await app.register(packageRoutes, { prefix: '/api/v1/skills' });
await app.register(categoryRoutes, { prefix: '/api/v1' });

const port = Number(process.env.SERVER_PORT) || 3001;
const host = process.env.SERVER_HOST || '0.0.0.0';

// ─── Graceful Shutdown ──────────────────────────────────
const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

try {
  await app.listen({ port, host });
  app.log.info(`Server running at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
