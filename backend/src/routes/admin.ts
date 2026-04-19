import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { authenticate } from './auth.js';
import { requireAdmin, formatSkill, slugifyTag, buildSkillOrderBy, fullTextSearchIds, deleteSkillWithCleanup } from '../lib/helpers.js';
import {
  validateOrThrow,
  AdminUserUpdateSchema,
  AdminUserListSchema,
  AdminSkillUpdateSchema,
  AdminCategoryCreateSchema,
  AdminCategoryUpdateSchema,
  AdminTagUpdateSchema,
  AdminTagMergeSchema,
  IdParamSchema,
  SlugParamSchema,
  PaginationSchema,
  SkillListQuerySchema,
} from '../lib/validation.js';

/**
 * All admin routes require authentication + admin role.
 * Registered under /api/v1/admin
 */
export async function adminRoutes(app: FastifyInstance) {
  // ─── Pre-handler: authenticate + require admin ────────
  app.addHook('preHandler', async (request, reply) => {
    const userId = await authenticate(request);
    await requireAdmin(userId);
    // Attach userId to request for downstream use
    (request as any).adminUserId = userId;
  });

  // ═══════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════

  app.get('/stats', async () => {
    const [totalUsers, totalSkills, totalDownloads, todayUsers, todaySkills] = await Promise.all([
      prisma.user.count(),
      prisma.skill.count(),
      prisma.downloadStat.count(),
      prisma.user.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.skill.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);

    // 30-day user registration trend
    const userTrend: { date: string; count: bigint }[] = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date`;

    // 30-day download trend
    const downloadTrend: { date: string; count: bigint }[] = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM download_stats
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date`;

    return {
      totalUsers,
      totalSkills,
      totalDownloads,
      todayUsers,
      todaySkills,
      userTrend: userTrend.map((r) => ({ date: String(r.date).slice(0, 10), count: Number(r.count) })),
      downloadTrend: downloadTrend.map((r) => ({ date: String(r.date).slice(0, 10), count: Number(r.count) })),
    };
  });

  // ═══════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════════════════

  // List users
  app.get('/users', async (request) => {
    const { q, role, banned, page, limit } = validateOrThrow(AdminUserListSchema, request.query);

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (banned !== undefined) where.banned = banned === 'true';

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, displayName: true,
          role: true, banned: true, createdAt: true,
          _count: { select: { skills: true, apiKeys: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  });

  // Get user detail
  app.get('/users/:id', async (request) => {
    const { id } = validateOrThrow(IdParamSchema, request.params);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, username: true, displayName: true, avatarUrl: true,
        role: true, banned: true, createdAt: true, updatedAt: true,
        _count: { select: { skills: true, apiKeys: true, teamMemberships: true } },
        skills: {
          select: { id: true, name: true, displayName: true, visibility: true, downloadCount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!user) throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');

    return {
      ...user,
      skills: user.skills.map((s) => ({ ...s, downloadCount: Number(s.downloadCount) })),
    };
  });

  // Update user (role / banned)
  app.patch('/users/:id', async (request) => {
    const { id } = validateOrThrow(IdParamSchema, request.params);
    const data = validateOrThrow(AdminUserUpdateSchema, request.body);

    const adminUserId = (request as any).adminUserId;
    if (id === adminUserId && data.role && data.role !== 'admin') {
      throw new AppError(400, ErrorCode.VALIDATION_FAILED, 'Cannot demote yourself');
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, banned: true },
    });
    request.log.info({ targetUserId: user.id, changes: data }, 'Admin updated user');
    return user;
  });

  // Delete user
  app.delete('/users/:id', async (request) => {
    const { id } = validateOrThrow(IdParamSchema, request.params);

    const adminUserId = (request as any).adminUserId;
    if (id === adminUserId) {
      throw new AppError(400, ErrorCode.VALIDATION_FAILED, 'Cannot delete yourself');
    }

    await prisma.user.delete({ where: { id } });
    request.log.info({ targetUserId: id }, 'Admin deleted user');
    return { success: true };
  });

  // ═══════════════════════════════════════════════════════
  // SKILL MANAGEMENT
  // ═══════════════════════════════════════════════════════

  // List all skills (admin view — includes private/team)
  app.get('/skills', async (request) => {
    const { q, category, author, sort, page, limit } = validateOrThrow(SkillListQuerySchema, request.query);

    const where: Record<string, unknown> = {};
    // No visibility filter — admin sees everything
    if (q) {
      const ids = await fullTextSearchIds(q);
      if (ids.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      where.id = { in: ids };
    }
    if (category) where.category = { slug: category };
    if (author) where.author = { username: author };

    const orderBy = buildSkillOrderBy(sort);

    const [data, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: {
          author: { select: { username: true, displayName: true } },
          category: { select: { name: true, slug: true } },
          tags: { select: { tag: { select: { name: true, slug: true } } } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.skill.count({ where }),
    ]);

    return {
      data: data.map(formatSkill),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // Update skill (featured / visibility)
  app.patch('/skills/:name', async (request) => {
    const name = (request.params as { name: string }).name;
    const data = validateOrThrow(AdminSkillUpdateSchema, request.body);

    const skill = await prisma.skill.update({
      where: { name },
      data,
      select: { id: true, name: true, featured: true, visibility: true },
    });
    request.log.info({ skillName: name, changes: data }, 'Admin updated skill');
    return skill;
  });

  // Force-delete skill
  app.delete('/skills/:name', async (request) => {
    const name = (request.params as { name: string }).name;

    const skill = await prisma.skill.findUnique({ where: { name }, select: { id: true } });
    if (!skill) throw new AppError(404, ErrorCode.SKILL_NOT_FOUND, 'Skill not found');

    const packageCount = await deleteSkillWithCleanup(skill.id, request.log);

    request.log.info({ skillId: skill.id, skillName: name, packageCount }, 'Admin force-deleted skill');
    return { success: true };
  });

  // ═══════════════════════════════════════════════════════
  // CATEGORY MANAGEMENT
  // ═══════════════════════════════════════════════════════

  // Create category
  app.post('/categories', async (request) => {
    const data = validateOrThrow(AdminCategoryCreateSchema, request.body);

    const category = await prisma.category.create({ data });
    request.log.info({ categorySlug: data.slug }, 'Admin created category');
    return category;
  });

  // Update category
  app.patch('/categories/:slug', async (request) => {
    const { slug } = validateOrThrow(SlugParamSchema, request.params);
    const data = validateOrThrow(AdminCategoryUpdateSchema, request.body);

    const category = await prisma.category.update({
      where: { slug },
      data,
    });
    request.log.info({ categorySlug: slug, changes: data }, 'Admin updated category');
    return category;
  });

  // Delete category
  app.delete('/categories/:slug', async (request) => {
    const { slug } = validateOrThrow(SlugParamSchema, request.params);

    // Unlink skills before deleting
    await prisma.skill.updateMany({
      where: { category: { slug } },
      data: { categoryId: null },
    });

    await prisma.category.delete({ where: { slug } });
    request.log.info({ categorySlug: slug }, 'Admin deleted category');
    return { success: true };
  });

  // ═══════════════════════════════════════════════════════
  // TAG MANAGEMENT
  // ═══════════════════════════════════════════════════════

  // List tags with usage count
  app.get('/tags', async () => {
    const tags = await prisma.tag.findMany({
      include: { _count: { select: { skills: true } } },
      orderBy: { skills: { _count: 'desc' } },
    });
    return tags;
  });

  // Rename tag
  app.patch('/tags/:slug', async (request) => {
    const { slug } = validateOrThrow(SlugParamSchema, request.params);
    const { name: newName } = validateOrThrow(AdminTagUpdateSchema, request.body);

    const newSlug = slugifyTag(newName);
    const tag = await prisma.tag.update({
      where: { slug },
      data: { name: newName, slug: newSlug },
    });
    request.log.info({ oldSlug: slug, newSlug }, 'Admin renamed tag');
    return tag;
  });

  // Merge tags
  app.post('/tags/merge', async (request) => {
    const { source, target } = validateOrThrow(AdminTagMergeSchema, request.body);

    const targetSlug = slugifyTag(target);

    // Ensure target tag exists or create it
    const targetTag = await prisma.tag.upsert({
      where: { slug: targetSlug },
      update: {},
      create: { name: target, slug: targetSlug },
    });

    // Get source tag IDs
    const sourceTags = await prisma.tag.findMany({
      where: { slug: { in: source.map(slugifyTag) } },
      select: { id: true, slug: true },
    });
    const sourceIds = sourceTags.map((t) => t.id);

    if (sourceIds.length > 0) {
      // Move skill-tag relations to target (skip duplicates)
      const existingRelations = await prisma.skillTagRelation.findMany({
        where: { tagId: targetTag.id },
        select: { skillId: true },
      });
      const existingSkillIds = new Set(existingRelations.map((r) => r.skillId));

      const relationsToMove = await prisma.skillTagRelation.findMany({
        where: {
          tagId: { in: sourceIds },
          skillId: { notIn: [...existingSkillIds] },
        },
      });

      if (relationsToMove.length > 0) {
        await prisma.skillTagRelation.createMany({
          data: relationsToMove.map((r) => ({ skillId: r.skillId, tagId: targetTag.id })),
          skipDuplicates: true,
        });
      }

      // Delete source relations and tags
      await prisma.skillTagRelation.deleteMany({ where: { tagId: { in: sourceIds } } });
      await prisma.tag.deleteMany({ where: { id: { in: sourceIds } } });
    }

    request.log.info({ source, target, merged: sourceIds.length }, 'Admin merged tags');
    return { success: true, target: targetTag, mergedCount: sourceIds.length };
  });

  // Delete tag
  app.delete('/tags/:slug', async (request) => {
    const { slug } = validateOrThrow(SlugParamSchema, request.params);

    // Remove all skill-tag relations first
    const tag = await prisma.tag.findUnique({ where: { slug } });
    if (!tag) throw new AppError(404, ErrorCode.NOT_FOUND, 'Tag not found');

    await prisma.skillTagRelation.deleteMany({ where: { tagId: tag.id } });
    await prisma.tag.delete({ where: { slug } });
    request.log.info({ tagSlug: slug }, 'Admin deleted tag');
    return { success: true };
  });
}
