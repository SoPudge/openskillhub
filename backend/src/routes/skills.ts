import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, optionalAuthenticate } from './auth.js';
import { AGENT_TYPES } from '@openskillhub/shared';
import { validate, SkillCreateSchema, SkillUpdateSchema, SkillListQuerySchema, CheckUpdatesSchema, NameParamSchema } from '../lib/validation.js';

export async function skillRoutes(app: FastifyInstance) {
  // List / Search skills
  app.get('/', async (request, reply) => {
    const v = validate(SkillListQuerySchema, request.query);
    if (!v.success) return reply.status(400).send({ error: v.error });
    const { q, category, tag, agent, author, sort, page, limit } = v.data;
    const skip = (page - 1) * limit;

    const userId = await optionalAuthenticate(request);

    const where: Record<string, unknown> = {};

    // Visibility: unauthenticated sees only public; authenticated sees public + own private + team skills
    if (userId) {
      const teamIds = (await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } })).map((t) => t.teamId);
      where.OR = [
        { visibility: 'public' },
        { visibility: 'private', authorId: userId },
        ...(teamIds.length ? [{ visibility: 'team', teamId: { in: teamIds } }] : []),
      ];
    } else {
      where.visibility = 'public';
    }

    if (author) {
      where.author = { username: author };
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

    // Full-text search: use PG tsvector when q is provided
    if (q) {
      // Convert user query to tsquery (prefix matching with :*)
      // Sanitize input: strip non-alphanumeric chars to prevent tsquery injection
      const tsQuery = q.trim().split(/\s+/).map((w) => w.replace(/[^\w-]/g, '')).filter(Boolean).map((w) => `${w}:*`).join(' & ');
      if (!tsQuery) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      const matchingIds = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM skills WHERE search_vector @@ to_tsquery('english', $1)`,
        tsQuery,
      );
      if (matchingIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      where.id = { in: matchingIds.map((r) => r.id) };
    }

    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (sort === 'downloads') orderBy = { downloadCount: 'desc' };
    else if (sort === 'updated') orderBy = { updatedAt: 'desc' };
    else if (sort === 'name') orderBy = { name: 'asc' };
    else if (sort === 'created') orderBy = { createdAt: 'asc' };

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
  app.get('/:name', async (request, reply) => {
    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) return reply.status(400).send({ error: pv.error });

    const userId = await optionalAuthenticate(request);

    const skill = await prisma.skill.findUnique({
      where: { name: pv.data.name },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: true } },
        versions: {
          orderBy: { createdAt: 'desc' },
          include: {
            packages: { select: { agentType: true, fileSize: true, checksumSha256: true } },
          },
        },
      },
    });

    if (!skill) return reply.status(404).send({ error: 'Skill not found' });

    // Visibility check
    if (skill.visibility === 'private' && skill.authorId !== userId) {
      return reply.status(404).send({ error: 'Skill not found' });
    }
    if (skill.visibility === 'team' && skill.teamId) {
      if (!userId) return reply.status(404).send({ error: 'Skill not found' });
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: skill.teamId, userId } },
      });
      if (!membership) return reply.status(404).send({ error: 'Skill not found' });
    }

    return formatSkill(skill);
  });

  // Create skill
  app.post('/', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const v = validate(SkillCreateSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });
    const { name, displayName, description, categoryId, teamId, visibility, homepageUrl, license, tags } = v.data;

    // Validate team membership if teamId provided
    if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
      });
      if (!membership) return reply.status(403).send({ error: 'Not a member of this team' });
    }

    // Validate visibility + teamId combination
    if (visibility === 'team' && !teamId) {
      return reply.status(400).send({ error: 'teamId is required for team visibility' });
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
        teamId,
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
  app.patch('/:name', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) return reply.status(400).send({ error: pv.error });
    const v = validate(SkillUpdateSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });

    const skill = await prisma.skill.findUnique({ where: { name: pv.data.name } });
    if (!skill) return reply.status(404).send({ error: 'Skill not found' });
    if (skill.authorId !== userId) return reply.status(403).send({ error: 'Not the skill author' });

    const updated = await prisma.skill.update({
      where: { id: skill.id },
      data: v.data,
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        tags: { include: { tag: true } },
      },
    });

    return formatSkill(updated);
  });

  // Delete skill
  app.delete('/:name', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) return reply.status(400).send({ error: pv.error });

    const skill = await prisma.skill.findUnique({ where: { name: pv.data.name } });
    if (!skill) return reply.status(404).send({ error: 'Skill not found' });
    if (skill.authorId !== userId) return reply.status(403).send({ error: 'Not the skill author' });

    await prisma.skill.delete({ where: { id: skill.id } });
    return reply.status(204).send();
  });

  // Check updates (batch) — uses single query instead of N+1
  app.post('/check-updates', async (request, reply) => {
    const v = validate(CheckUpdatesSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });
    const { skills: installed } = v.data;

    const skillNames = installed.map((s) => s.name);
    const skills = await prisma.skill.findMany({
      where: { name: { in: skillNames } },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const skillMap = new Map(skills.map((s) => [s.name, s]));

    const updates = installed
      .map((item) => {
        const skill = skillMap.get(item.name);
        if (!skill?.versions[0]) return null;
        const latest = skill.versions[0];
        return {
          name: item.name,
          currentVersion: item.version,
          latestVersion: latest.version,
          hasUpdate: latest.version !== item.version,
          changelog: latest.changelog || undefined,
        };
      })
      .filter(Boolean);

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
