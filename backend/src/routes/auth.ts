import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { validate, RegisterSchema, LoginSchema, ApiKeyCreateSchema, IdParamSchema } from '../lib/validation.js';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function authRoutes(app: FastifyInstance) {
  // Stricter rate limit for auth endpoints
  const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } };

  // Register
  app.post('/register', { ...authRateLimit }, async (request, reply) => {
    const v = validate(RegisterSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });
    const { email, username, password, displayName } = v.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      request.log.warn({ username, email: email.replace(/(.{2}).*(@.*)/, '$1***$2') }, 'Registration conflict');
      return reply.status(409).send({ error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, passwordHash, displayName },
      select: { id: true, email: true, username: true, displayName: true, createdAt: true },
    });

    request.log.info({ userId: user.id, username }, 'User registered');
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return reply.status(201).send({ user, token });
  });

  // Login
  app.post('/login', { ...authRateLimit }, async (request, reply) => {
    const v = validate(LoginSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });
    const { email, password } = v.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      request.log.warn({ email: email.replace(/(.{2}).*(@.*)/, '$1***$2') }, 'Login failed: invalid credentials');
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    request.log.info({ userId: user.id, username: user.username }, 'User logged in');
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
  app.post('/api-keys', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const v = validate(ApiKeyCreateSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });
    const { name } = v.data;
    const rawKey = `osh_${randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 8);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await prisma.apiKey.create({
      data: { userId, name, keyHash, keyPrefix },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    });

    request.log.info({ userId, keyPrefix, keyName: name }, 'API key created');
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

    const pv = validate(IdParamSchema, request.params);
    if (!pv.success) return reply.status(400).send({ error: pv.error });

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: pv.data.id, userId },
    });
    if (!apiKey) return reply.status(404).send({ error: 'API key not found' });

    await prisma.apiKey.delete({ where: { id: apiKey.id } });
    request.log.info({ userId, keyId: apiKey.id, keyPrefix: apiKey.keyPrefix }, 'API key deleted');
    return reply.status(204).send();
  });
}

// ─── Auth Helper ────────────────────────────────────────

type ResolveResult =
  | { userId: string; error?: undefined; authMethod?: undefined }
  | { userId?: undefined; error: string; authMethod?: 'jwt' | 'apikey' };

/**
 * Core credential resolver — extracts userId from JWT or API Key header.
 * Returns { userId } on success, or { error } describing the failure reason.
 */
async function resolveCredentials(
  headers: Record<string, string | string[] | undefined>,
): Promise<ResolveResult> {
  const authHeader = headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string };
      return { userId: payload.sub };
    } catch {
      return { error: 'Invalid token', authMethod: 'jwt' as const };
    }
  }

  const apiKeyHeader = headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    const keys = await prisma.apiKey.findMany({
      where: { keyPrefix: apiKeyHeader.slice(0, 8) },
    });
    for (const key of keys) {
      if (await bcrypt.compare(apiKeyHeader, key.keyHash)) {
        prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => { /* best-effort */ });
        return { userId: key.userId };
      }
    }
    return { error: 'Invalid API key', authMethod: 'apikey' as const };
  }

  return { error: 'Authentication required' };
}

/**
 * Optional authentication — returns userId if valid credentials present, null otherwise.
 * Does NOT send 401; callers decide how to handle unauthenticated requests.
 */
export async function optionalAuthenticate(
  request: { headers: Record<string, string | string[] | undefined> },
): Promise<string | null> {
  const result = await resolveCredentials(request.headers);
  return result.userId ?? null;
}

export async function authenticate(
  request: { headers: Record<string, string | string[] | undefined>; log: { warn: (obj: Record<string, unknown>, msg: string) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): Promise<string | null> {
  const result = await resolveCredentials(request.headers);
  if (result.userId) return result.userId;
  if (result.authMethod) {
    request.log.warn({ method: result.authMethod }, `Auth failed: ${result.error}`);
  }
  reply.status(401).send({ error: result.error });
  return null;
}
