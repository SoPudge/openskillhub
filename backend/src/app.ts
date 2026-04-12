import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { skillRoutes } from './routes/skills.js';
import { versionRoutes } from './routes/versions.js';
import { packageRoutes } from './routes/packages.js';
import { categoryRoutes } from './routes/categories.js';
import { authRoutes } from './routes/auth.js';

// Prisma returns BigInt for certain columns; ensure JSON serialization works
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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

try {
  await app.listen({ port, host });
  app.log.info(`Server running at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
