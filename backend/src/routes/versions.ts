import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from './auth.js';
import { validate, VersionCreateSchema, NameParamSchema, NameVersionParamSchema, PaginationSchema } from '../lib/validation.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { getSkillOrThrow, assertSkillAuthor, getVersionOrThrow, normalizeFileSize } from '../lib/helpers.js';

export async function versionRoutes(app: FastifyInstance) {
  // List versions for a skill
  app.get('/:name/versions', async (request, reply) => {
    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);
    const qv = validate(PaginationSchema, request.query);
    if (!qv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, qv.error);
    const { page, limit } = qv.data;

    const skill = await getSkillOrThrow(pv.data.name);

    const [versions, total] = await Promise.all([
      prisma.skillVersion.findMany({
        where: { skillId: skill.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          packages: { select: { agentType: true, fileSize: true } },
        },
      }),
      prisma.skillVersion.count({ where: { skillId: skill.id } }),
    ]);

    return {
      data: versions.map((v) => ({
        ...v,
        packages: v.packages.map(normalizeFileSize),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // Create a new version
  app.post('/:name/versions', async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);

    const skill = await getSkillOrThrow(pv.data.name);
    assertSkillAuthor(skill, userId);

    const v = validate(VersionCreateSchema, request.body);
    if (!v.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, v.error);
    const { version, changelog } = v.data;

    const existing = await prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId: skill.id, version } },
    });
    if (existing) {
      request.log.warn({ skillName: pv.data.name, version }, 'Version conflict: already exists');
      throw new AppError(409, ErrorCode.VERSION_CONFLICT, 'Version already exists');
    }

    const created = await prisma.skillVersion.create({
      data: { skillId: skill.id, version, changelog },
    });

    request.log.info({ userId, skillName: pv.data.name, version }, 'Version created');
    return reply.status(201).send(created);
  });

  // Get specific version
  app.get('/:name/versions/:version', async (request, reply) => {
    const pv = validate(NameVersionParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);

    const skill = await getSkillOrThrow(pv.data.name);

    const version = await prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId: skill.id, version: pv.data.version } },
      include: {
        packages: { select: { agentType: true, fileSize: true, checksumSha256: true } },
      },
    });

    if (!version) throw new AppError(404, ErrorCode.VERSION_NOT_FOUND, 'Version not found');
    return {
      ...version,
      packages: version.packages.map(normalizeFileSize),
    };
  });
}
