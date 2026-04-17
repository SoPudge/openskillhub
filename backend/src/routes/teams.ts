import type { FastifyInstance } from 'fastify';
import { prisma, USER_SELECT } from '../lib/prisma.js';
import { authenticate } from './auth.js';
import { validate, TeamCreateSchema, TeamUpdateSchema, TeamMemberAddSchema, SlugParamSchema, SlugMemberParamSchema, PaginationSchema } from '../lib/validation.js';
import { AppError, ErrorCode } from '../lib/errors.js';

export async function teamRoutes(app: FastifyInstance) {
  // Create team
  app.post('/', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const v = validate(TeamCreateSchema, request.body);
    if (!v.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, v.error);
    const { name, slug } = v.data;

    const existing = await prisma.team.findUnique({ where: { slug } });
    if (existing) {
      request.log.warn({ userId, slug }, 'Team slug conflict');
      throw new AppError(409, ErrorCode.TEAM_SLUG_TAKEN, 'Team slug already taken');
    }

    const team = await prisma.team.create({
      data: {
        name,
        slug,
        ownerId: userId,
        members: { create: { userId, role: 'owner' } },
      },
      include: {
        owner: { select: USER_SELECT },
        _count: { select: { members: true } },
      },
    });

    request.log.info({ userId, teamName: name, teamSlug: slug }, 'Team created');
    return reply.status(201).send(team);
  });

  // List my teams
  app.get('/', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const teams = await prisma.team.findMany({
      where: { members: { some: { userId } } },
      include: {
        owner: { select: USER_SELECT },
        _count: { select: { members: true, skills: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return teams;
  });

  // Get team by slug
  app.get('/:slug', async (request, reply) => {
    const pv = validate(SlugParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);

    const team = await prisma.team.findUnique({
      where: { slug: pv.data.slug },
      include: {
        owner: { select: USER_SELECT },
        members: {
          include: { user: { select: USER_SELECT } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { skills: true } },
      },
    });

    if (!team) throw new AppError(404, ErrorCode.TEAM_NOT_FOUND, 'Team not found');
    return team;
  });

  // Update team
  app.patch('/:slug', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(SlugParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);
    const v = validate(TeamUpdateSchema, request.body);
    if (!v.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, v.error);

    const team = await prisma.team.findUnique({ where: { slug: pv.data.slug } });
    if (!team) throw new AppError(404, ErrorCode.TEAM_NOT_FOUND, 'Team not found');

    // Only owner or admin can update
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      request.log.warn({ userId, teamSlug: pv.data.slug, action: 'update' }, 'Team update denied');
      throw new AppError(403, ErrorCode.TEAM_NOT_ADMIN, 'Insufficient permissions');
    }

    const updated = await prisma.team.update({
      where: { id: team.id },
      data: v.data,
    });

    request.log.info({ userId, teamSlug: pv.data.slug, fields: Object.keys(v.data) }, 'Team updated');
    return updated;
  });

  // Delete team
  app.delete('/:slug', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(SlugParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);

    const team = await prisma.team.findUnique({ where: { slug: pv.data.slug } });
    if (!team) throw new AppError(404, ErrorCode.TEAM_NOT_FOUND, 'Team not found');
    if (team.ownerId !== userId) {
      request.log.warn({ userId, teamSlug: pv.data.slug }, 'Team delete denied: not owner');
      throw new AppError(403, ErrorCode.TEAM_NOT_OWNER, 'Only the owner can delete the team');
    }

    await prisma.team.delete({ where: { id: team.id } });
    request.log.info({ userId, teamSlug: pv.data.slug }, 'Team deleted');
    return reply.status(204).send();
  });

  // ─── Members ──────────────────────────────────────────

  // Add member
  app.post('/:slug/members', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(SlugParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);
    const v = validate(TeamMemberAddSchema, request.body);
    if (!v.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, v.error);

    const team = await prisma.team.findUnique({ where: { slug: pv.data.slug } });
    if (!team) throw new AppError(404, ErrorCode.TEAM_NOT_FOUND, 'Team not found');

    // Only owner or admin can add members
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      request.log.warn({ userId, teamSlug: pv.data.slug, action: 'addMember' }, 'Team member add denied');
      throw new AppError(403, ErrorCode.TEAM_NOT_ADMIN, 'Insufficient permissions');
    }

    // Only owner can assign admin role
    if (v.data.role === 'admin' && membership.role !== 'owner') {
      request.log.warn({ userId, teamSlug: pv.data.slug, targetRole: 'admin' }, 'Admin role assign denied: not owner');
      throw new AppError(403, ErrorCode.TEAM_NOT_OWNER, 'Only the owner can assign admin role');
    }

    const targetUser = await prisma.user.findUnique({ where: { username: v.data.username } });
    if (!targetUser) throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: targetUser.id } },
    });
    if (existing) throw new AppError(409, ErrorCode.TEAM_MEMBER_EXISTS, 'User is already a member');

    const member = await prisma.teamMember.create({
      data: { teamId: team.id, userId: targetUser.id, role: v.data.role },
      include: { user: { select: USER_SELECT } },
    });

    request.log.info({ userId, teamSlug: pv.data.slug, targetUsername: v.data.username, role: v.data.role }, 'Team member added');
    return reply.status(201).send(member);
  });

  // Remove member
  app.delete('/:slug/members/:username', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(SlugMemberParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);

    const team = await prisma.team.findUnique({ where: { slug: pv.data.slug } });
    if (!team) throw new AppError(404, ErrorCode.TEAM_NOT_FOUND, 'Team not found');

    // Only owner or admin can remove; members can remove themselves
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });

    const targetUser = await prisma.user.findUnique({ where: { username: pv.data.username } });
    if (!targetUser) throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');

    const isSelf = targetUser.id === userId;
    const isAdminOrOwner = membership && ['owner', 'admin'].includes(membership.role);

    if (!isSelf && !isAdminOrOwner) {
      request.log.warn({ userId, teamSlug: pv.data.slug, action: 'removeMember' }, 'Team member remove denied');
      throw new AppError(403, ErrorCode.TEAM_NOT_ADMIN, 'Insufficient permissions');
    }

    // Cannot remove the owner
    if (targetUser.id === team.ownerId) {
      throw new AppError(400, ErrorCode.TEAM_OWNER_LEAVE, 'Cannot remove the team owner');
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId: team.id, userId: targetUser.id } },
    });

    request.log.info({ userId, teamSlug: pv.data.slug, targetUsername: pv.data.username }, 'Team member removed');
    return reply.status(204).send();
  });

  // List members
  app.get('/:slug/members', async (request, reply) => {
    const pv = validate(SlugParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);

    const team = await prisma.team.findUnique({ where: { slug: pv.data.slug } });
    if (!team) throw new AppError(404, ErrorCode.TEAM_NOT_FOUND, 'Team not found');

    const qv = validate(PaginationSchema, request.query);
    if (!qv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, qv.error);
    const { page, limit } = qv.data;

    const [members, total] = await Promise.all([
      prisma.teamMember.findMany({
        where: { teamId: team.id },
        include: { user: { select: { ...USER_SELECT, avatarUrl: true } } },
        orderBy: { joinedAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.teamMember.count({ where: { teamId: team.id } }),
    ]);

    return {
      data: members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });
}
