import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from './auth.js';
import { validate, TeamCreateSchema, TeamUpdateSchema, TeamMemberAddSchema, NameParamSchema } from '../lib/validation.js';

export async function teamRoutes(app: FastifyInstance) {
  // Create team
  app.post('/', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const v = validate(TeamCreateSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });
    const { name, slug } = v.data;

    const existing = await prisma.team.findUnique({ where: { slug } });
    if (existing) return reply.status(409).send({ error: 'Team slug already taken' });

    const team = await prisma.team.create({
      data: {
        name,
        slug,
        ownerId: userId,
        members: { create: { userId, role: 'owner' } },
      },
      include: {
        owner: { select: { id: true, username: true, displayName: true } },
        _count: { select: { members: true } },
      },
    });

    return reply.status(201).send(team);
  });

  // List my teams
  app.get('/', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const teams = await prisma.team.findMany({
      where: { members: { some: { userId } } },
      include: {
        owner: { select: { id: true, username: true, displayName: true } },
        _count: { select: { members: true, skills: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return teams;
  });

  // Get team by slug
  app.get('/:slug', async (request, reply) => {
    const team = await prisma.team.findUnique({
      where: { slug: (request.params as { slug: string }).slug },
      include: {
        owner: { select: { id: true, username: true, displayName: true } },
        members: {
          include: { user: { select: { id: true, username: true, displayName: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { skills: true } },
      },
    });

    if (!team) return reply.status(404).send({ error: 'Team not found' });
    return team;
  });

  // Update team
  app.patch('/:slug', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const v = validate(TeamUpdateSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });

    const slug = (request.params as { slug: string }).slug;
    const team = await prisma.team.findUnique({ where: { slug } });
    if (!team) return reply.status(404).send({ error: 'Team not found' });

    // Only owner or admin can update
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.team.update({
      where: { id: team.id },
      data: v.data,
    });

    return updated;
  });

  // Delete team
  app.delete('/:slug', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const slug = (request.params as { slug: string }).slug;
    const team = await prisma.team.findUnique({ where: { slug } });
    if (!team) return reply.status(404).send({ error: 'Team not found' });
    if (team.ownerId !== userId) return reply.status(403).send({ error: 'Only the owner can delete the team' });

    await prisma.team.delete({ where: { id: team.id } });
    return reply.status(204).send();
  });

  // ─── Members ──────────────────────────────────────────

  // Add member
  app.post('/:slug/members', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const v = validate(TeamMemberAddSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });

    const slug = (request.params as { slug: string }).slug;
    const team = await prisma.team.findUnique({ where: { slug } });
    if (!team) return reply.status(404).send({ error: 'Team not found' });

    // Only owner or admin can add members
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    // Only owner can assign admin role
    if (v.data.role === 'admin' && membership.role !== 'owner') {
      return reply.status(403).send({ error: 'Only the owner can assign admin role' });
    }

    const targetUser = await prisma.user.findUnique({ where: { username: v.data.username } });
    if (!targetUser) return reply.status(404).send({ error: 'User not found' });

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: targetUser.id } },
    });
    if (existing) return reply.status(409).send({ error: 'User is already a member' });

    const member = await prisma.teamMember.create({
      data: { teamId: team.id, userId: targetUser.id, role: v.data.role },
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });

    return reply.status(201).send(member);
  });

  // Remove member
  app.delete('/:slug/members/:username', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const { slug, username } = request.params as { slug: string; username: string };
    const team = await prisma.team.findUnique({ where: { slug } });
    if (!team) return reply.status(404).send({ error: 'Team not found' });

    // Only owner or admin can remove; members can remove themselves
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });

    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser) return reply.status(404).send({ error: 'User not found' });

    const isSelf = targetUser.id === userId;
    const isAdminOrOwner = membership && ['owner', 'admin'].includes(membership.role);

    if (!isSelf && !isAdminOrOwner) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    // Cannot remove the owner
    if (targetUser.id === team.ownerId) {
      return reply.status(400).send({ error: 'Cannot remove the team owner' });
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId: team.id, userId: targetUser.id } },
    });

    return reply.status(204).send();
  });

  // List members
  app.get('/:slug/members', async (request, reply) => {
    const slug = (request.params as { slug: string }).slug;
    const team = await prisma.team.findUnique({ where: { slug } });
    if (!team) return reply.status(404).send({ error: 'Team not found' });

    const members = await prisma.teamMember.findMany({
      where: { teamId: team.id },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  });
}
