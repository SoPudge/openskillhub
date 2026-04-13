import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from './auth.js';
import { validate, VersionCreateSchema, NameParamSchema, NameVersionParamSchema } from '../lib/validation.js';

export async function versionRoutes(app: FastifyInstance) {
  // List versions for a skill
  app.get('/:name/versions', async (request, reply) => {
    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) return reply.status(400).send({ error: pv.error });

    const skill = await prisma.skill.findUnique({ where: { name: pv.data.name } });
    if (!skill) return reply.status(404).send({ error: 'Skill not found' });

    const versions = await prisma.skillVersion.findMany({
      where: { skillId: skill.id },
      orderBy: { createdAt: 'desc' },
      include: {
        packages: { select: { agentType: true, fileSize: true } },
      },
    });

    return versions.map((v) => ({
      ...v,
      packages: v.packages.map((p) => ({ ...p, fileSize: Number(p.fileSize) })),
    }));
  });

  // Create a new version
  app.post('/:name/versions', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) return reply.status(400).send({ error: pv.error });

    const skill = await prisma.skill.findUnique({ where: { name: pv.data.name } });
    if (!skill) return reply.status(404).send({ error: 'Skill not found' });
    if (skill.authorId !== userId) return reply.status(403).send({ error: 'Not the skill author' });

    const v = validate(VersionCreateSchema, request.body);
    if (!v.success) return reply.status(400).send({ error: v.error });
    const { version, changelog } = v.data;

    const existing = await prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId: skill.id, version } },
    });
    if (existing) {
      return reply.status(409).send({ error: 'Version already exists' });
    }

    const created = await prisma.skillVersion.create({
      data: { skillId: skill.id, version, changelog },
    });

    return reply.status(201).send(created);
  });

  // Get specific version
  app.get('/:name/versions/:version', async (request, reply) => {
    const pv = validate(NameVersionParamSchema, request.params);
    if (!pv.success) return reply.status(400).send({ error: pv.error });

    const skill = await prisma.skill.findUnique({ where: { name: pv.data.name } });
    if (!skill) return reply.status(404).send({ error: 'Skill not found' });

    const version = await prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId: skill.id, version: pv.data.version } },
      include: {
        packages: { select: { agentType: true, fileSize: true, checksumSha256: true } },
      },
    });

    if (!version) return reply.status(404).send({ error: 'Version not found' });
    return {
      ...version,
      packages: version.packages.map((p) => ({ ...p, fileSize: Number(p.fileSize) })),
    };
  });
}
