import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post<{
    Body: { email: string; username: string; password: string; displayName?: string };
  }>('/register', async (request, reply) => {
    const { email, username, password, displayName } = request.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return reply.status(409).send({ error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, passwordHash, displayName },
      select: { id: true, email: true, username: true, displayName: true, createdAt: true },
    });

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return reply.status(201).send({ user, token });
  });

  // Login
  app.post<{
    Body: { email: string; password: string };
  }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
      token,
    };
  });

  // Get current user
  app.get('/me', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return user;
  });

  // Create API key
  app.post<{
    Body: { name: string };
  }>('/api-keys', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const { name } = request.body;
    const rawKey = `osh_${randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 8);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await prisma.apiKey.create({
      data: { userId, name, keyHash, keyPrefix },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    });

    // Return raw key only once
    return reply.status(201).send({ ...apiKey, key: rawKey });
  });

  // List API keys
  app.get('/api-keys', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  });

  // Delete API key
  app.delete<{ Params: { id: string } }>('/api-keys/:id', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: request.params.id, userId },
    });
    if (!apiKey) return reply.status(404).send({ error: 'API key not found' });

    await prisma.apiKey.delete({ where: { id: apiKey.id } });
    return reply.status(204).send();
  });
}

// ─── Auth Helper ────────────────────────────────────────

export async function authenticate(
  request: { headers: Record<string, string | string[] | undefined> },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): Promise<string | null> {
  // Try JWT first
  const authHeader = request.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string };
      return payload.sub;
    } catch {
      reply.status(401).send({ error: 'Invalid token' });
      return null;
    }
  }

  // Try API Key
  const apiKeyHeader = request.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    const keys = await prisma.apiKey.findMany({
      where: { keyPrefix: apiKeyHeader.slice(0, 8) },
    });
    for (const key of keys) {
      if (await bcrypt.compare(apiKeyHeader, key.keyHash)) {
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });
        return key.userId;
      }
    }
    reply.status(401).send({ error: 'Invalid API key' });
    return null;
  }

  reply.status(401).send({ error: 'Authentication required' });
  return null;
}
