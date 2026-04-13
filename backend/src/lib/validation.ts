import { z } from 'zod';
import { AGENT_TYPES, VISIBILITY_TYPES } from '@openskillhub/shared';

// ─── Auth ───────────────────────────────────────────────
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Alphanumeric, hyphens, underscores only'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().max(128).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ApiKeyCreateSchema = z.object({
  name: z.string().min(1).max(128),
});

// ─── Skills ─────────────────────────────────────────────
export const SkillCreateSchema = z.object({
  name: z.string().min(2).max(64).regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Lowercase alphanumeric + hyphens, must start with letter'),
  displayName: z.string().min(1).max(128),
  description: z.string().min(1).max(5000),
  categoryId: z.string().uuid().optional(),
  visibility: z.enum(VISIBILITY_TYPES).optional(),
  homepageUrl: z.string().url().max(512).optional().or(z.literal('')),
  license: z.string().max(64).optional(),
  tags: z.array(z.string().max(64)).max(20).optional(),
});

export const SkillUpdateSchema = z.object({
  displayName: z.string().min(1).max(128).optional(),
  description: z.string().min(1).max(5000).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  visibility: z.enum(VISIBILITY_TYPES).optional(),
  homepageUrl: z.string().url().max(512).optional().or(z.literal('')),
  license: z.string().max(64).optional(),
});

export const SkillListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(64).optional(),
  tag: z.string().max(200).optional(),
  agent: z.string().optional(),
  sort: z.enum(['downloads', 'updated', 'name', 'created']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Versions ───────────────────────────────────────────
export const VersionCreateSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+([-+].+)?$/, 'Must be semver format (e.g. 1.0.0)'),
  changelog: z.string().max(10000).optional(),
});

// ─── Check Updates ──────────────────────────────────────
export const CheckUpdatesSchema = z.object({
  skills: z.array(z.object({
    name: z.string().max(64),
    version: z.string().max(32),
    agent: z.string().max(32).optional(),
  })).min(1).max(100),
});

// ─── Teams ──────────────────────────────────────────────
export const TeamCreateSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().min(2).max(64).regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Lowercase alphanumeric + hyphens'),
});

export const TeamUpdateSchema = z.object({
  name: z.string().min(1).max(128).optional(),
});

export const TeamMemberAddSchema = z.object({
  username: z.string().min(2).max(64),
  role: z.enum(['admin', 'member']).optional().default('member'),
});

// ─── Download Stats ─────────────────────────────────────
export const StatsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional().default('day'),
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

// ─── Params ─────────────────────────────────────────────
export const NameParamSchema = z.object({
  name: z.string().min(1).max(64),
});

export const NameVersionParamSchema = z.object({
  name: z.string().min(1).max(64),
  version: z.string().min(1).max(32),
});

export const NameVersionAgentParamSchema = z.object({
  name: z.string().min(1).max(64),
  version: z.string().min(1).max(32),
  agent: z.string().min(1).max(32),
});

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

// ─── Helper ─────────────────────────────────────────────
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  return { success: false, error: messages };
}
