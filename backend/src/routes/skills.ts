import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from './auth.js';
import { AGENT_TYPES } from '@openskillhub/shared';

export async function skillRoutes(app: FastifyInstance) {
  // List / Search skills
  app.get<{
    Querystring: {
      q?: string;
      category?: string;
      tag?: string;
      agent?: string;
      visibility?: string;
      sort?: string;
      page?: string;
      limit?: string;
    };
  }>('/', async (request) => {
    const { q, category, tag, agent, visibility, sort, page: pageStr, limit: limitStr } = request.query;
    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, Number(limitStr) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (visibility) {
      where.visibility = visibility;
    } else {
      where.visibility = 'public';
    }

    if (category) {
      where.category = { slug: category };
    }

    if (tag) {
      const tagSlugs = tag.split(',').map((t) => t.trim());
      where.tags = { some: { tag: { slug: { in: tagSlugs } } } };
    }

    if (agent && AGENT_TYPES.includes(agent as (typeof AGENT_TYPES)[number])) {
      where.versions = { some: { packages: { some: { agentType: agent } } } };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (sort === 'downloads') orderBy = { downloadCount: 'desc' };
    else if (sort === 'updated') orderBy = { updatedAt: 'desc' };
    else if (sort === 'name') orderBy = { name: 'asc' };

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: { select: { id: true, username: true, displayName: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              packages: { select: { agentType: true } },
            },
          },
        },
      }),
      prisma.skill.count({ where }),
    ]);

    return {
      data: skills.map(formatSkill),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // Get skill by name
  app.get<{ Params: { name: string } }>('/:name', async (request, reply) => {
    const skill = await prisma.skill.findUnique({
      where: { name: request.params.name },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: true } },
        versions: {
          orderBy: { createdAt: 'desc' },
          include: {
            packages: { select: { agentType: true, fileSize: true } },
          },
        },
      },
    });

    if (!skill) return reply.status(404).send({ error: 'Skill not found' });
    return formatSkill(skill);
  });

  // Create skill
  app.post<{
    Body: {
      name: string;
      displayName: string;
      description: string;
      categoryId?: string;
      visibility?: string;
      homepageUrl?: string;
      license?: string;
      tags?: string[];
    };
  }>('/', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const { name, displayName, description, categoryId, visibility, homepageUrl, license, tags } =
      request.body;

    // Validate skill name
    if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name) || name.length > 64) {
      return reply
        .status(400)
        .send({ error: 'Name must be 2-64 chars, lowercase alphanumeric + hyphens' });
    }

    const existing = await prisma.skill.findUnique({ where: { name } });
    if (existing) {
      return reply.status(409).send({ error: 'Skill name already taken' });
    }

    const skill = await prisma.skill.create({
      data: {
        name,
        displayName,
        description,
        authorId: userId,
        categoryId,
        visibility: visibility || 'public',
        homepageUrl,
        license,
        tags: tags?.length
          ? {
              create: await Promise.all(
                tags.map(async (tagName) => {
                  const slug = tagName.toLowerCase().replace(/\s+/g, '-');
                  const tag = await prisma.tag.upsert({
                    where: { slug },
                    update: {},
                    create: { name: tagName, slug },
                  });
                  return { tagId: tag.id };
                }),
              ),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        tags: { include: { tag: true } },
      },
    });

    return reply.status(201).send(formatSkill(skill));
  });

  // Update skill
  app.patch<{
    Params: { name: string };
    Body: {
      displayName?: string;
      description?: string;
      categoryId?: string;
      visibility?: string;
      homepageUrl?: string;
      license?: string;
    };
  }>('/:name', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const skill = await prisma.skill.findUnique({ where: { name: request.params.name } });
    if (!skill) return reply.status(404).send({ error: 'Skill not found' });
    if (skill.authorId !== userId) return reply.status(403).send({ error: 'Not the skill author' });

    const updated = await prisma.skill.update({
      where: { id: skill.id },
      data: request.body,
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        tags: { include: { tag: true } },
      },
    });

    return formatSkill(updated);
  });

  // Delete skill
  app.delete<{ Params: { name: string } }>('/:name', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const skill = await prisma.skill.findUnique({ where: { name: request.params.name } });
    if (!skill) return reply.status(404).send({ error: 'Skill not found' });
    if (skill.authorId !== userId) return reply.status(403).send({ error: 'Not the skill author' });

    await prisma.skill.delete({ where: { id: skill.id } });
    return reply.status(204).send();
  });

  // Check updates (batch)
  app.post<{
    Body: { skills: { name: string; version: string; agent?: string }[] };
  }>('/check-updates', async (request) => {
    const { skills: installed } = request.body;
    if (!Array.isArray(installed)) {
      return { updates: [] };
    }
    const updates: { name: string; currentVersion: string; latestVersion: string; hasUpdate: boolean; changelog?: string }[] = [];

    for (const item of installed) {
      const skill = await prisma.skill.findUnique({
        where: { name: item.name },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!skill?.versions[0]) continue;
      const latest = skill.versions[0];
      const hasUpdate = latest.version !== item.version;
      updates.push({
        name: item.name,
        currentVersion: item.version,
        latestVersion: latest.version,
        hasUpdate,
        changelog: latest.changelog || undefined,
      });
    }

    return { updates };
  });
}

// ─── Helper ─────────────────────────────────────────────
function formatSkill(skill: Record<string, unknown>) {
  const s = { ...skill } as Record<string, unknown>;
  s.downloadCount = Number(s.downloadCount ?? 0);
  s.tags = Array.isArray(s.tags) ? s.tags.map((t: Record<string, unknown>) => (t as Record<string, unknown>).tag ?? t) : undefined;
  return s;
}
