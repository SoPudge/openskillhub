import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validateOrThrow } from '../lib/validation.js';

const CLAWHUB_BASE = 'https://clawhub.ai/api/v1';
const CLAWHUB_TIMEOUT = 8000;

// ─── Validation ─────────────────────────────────────────
const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  sort: z.enum(['updated', 'downloads', 'stars', 'trending']).default('downloads'),
});

const SlugParamSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
});

// ─── Helper ─────────────────────────────────────────────
async function clawhubFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAWHUB_TIMEOUT);
  try {
    const res = await fetch(`${CLAWHUB_BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`ClawHub API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Types ──────────────────────────────────────────────
interface ClawHubSearchResult {
  score: number;
  slug: string;
  displayName: string;
  summary: string;
  version: string | null;
  updatedAt: number;
}

interface ClawHubSkillSummary {
  slug: string;
  displayName: string;
  summary: string;
  tags: Record<string, string>;
  stats: {
    comments: number;
    downloads: number;
    installsAllTime?: number;
    installsCurrent?: number;
    stars: number;
    versions: number;
  };
  createdAt: number;
  updatedAt: number;
}

interface ClawHubSkillDetail {
  skill: ClawHubSkillSummary;
  latestVersion: {
    version: string;
    createdAt: number;
    changelog: string;
    files: { path: string; size: number }[];
  } | null;
}

// ─── Routes ─────────────────────────────────────────────
export async function clawhubRoutes(app: FastifyInstance) {
  // Search ClawHub skills (vector search)
  app.get('/search', async (request) => {
    const { q, limit } = validateOrThrow(SearchQuerySchema, request.query);
    const data = await clawhubFetch<{ results: ClawHubSearchResult[] }>(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    );
    return data;
  });

  // List ClawHub skills
  app.get('/skills', async (request) => {
    const { limit, cursor, sort } = validateOrThrow(ListQuerySchema, request.query);
    let path = `/skills?limit=${limit}&sort=${sort}`;
    if (cursor) path += `&cursor=${encodeURIComponent(cursor)}`;
    const data = await clawhubFetch<{ items: ClawHubSkillSummary[]; nextCursor: string | null }>(path);
    return data;
  });

  // Get a specific ClawHub skill detail
  app.get('/skills/:slug', async (request) => {
    const { slug } = validateOrThrow(SlugParamSchema, request.params);
    const data = await clawhubFetch<ClawHubSkillDetail>(`/skills/${slug}`);
    return data;
  });
}
