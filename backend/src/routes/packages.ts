import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import AdmZip from 'adm-zip';
import { parse as parseYaml } from 'yaml';
import { prisma } from '../lib/prisma.js';
import { createStorage } from '../storage/index.js';
import { authenticate } from './auth.js';
import { AGENT_TYPES } from '@openskillhub/shared';
import { validate, NameVersionParamSchema, NameVersionAgentParamSchema } from '../lib/validation.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { getSkillOrThrow, assertSkillAuthor, getVersionOrThrow } from '../lib/helpers.js';

const storage = createStorage();

export async function packageRoutes(app: FastifyInstance) {
  // Upload a package (stricter rate limit)
  app.post('/:name/versions/:version/packages', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return;

    const pv = validate(NameVersionParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);

    const skill = await getSkillOrThrow(pv.data.name);
    assertSkillAuthor(skill, userId);

    const skillVersion = await getVersionOrThrow(skill.id, pv.data.version);

    const data = await request.file();
    if (!data) throw new AppError(400, ErrorCode.VALIDATION_FAILED, 'No file uploaded');

    const agentType = (data.fields['agent_type'] as { value?: string } | undefined)?.value;
    if (!agentType || !AGENT_TYPES.includes(agentType as (typeof AGENT_TYPES)[number])) {
      throw new AppError(400, ErrorCode.VALIDATION_FAILED, `Invalid agent_type. Must be one of: ${AGENT_TYPES.join(', ')}`);
    }

    const buffer = await data.toBuffer();

    // Validate zip
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      // Security: check for path traversal and malicious paths
      for (const entry of entries) {
        if (
          entry.entryName.includes('..') ||
          entry.entryName.startsWith('/') ||
          entry.entryName.includes('\0') ||
          entry.entryName.includes('\\')
        ) {
          request.log.warn({ userId, skillName: pv.data.name, path: entry.entryName }, 'Path traversal detected in zip');
          throw new AppError(400, ErrorCode.PACKAGE_PATH_TRAVERSAL, 'Zip contains invalid path');
        }
      }

      // Check for SKILL.md
      const skillMd = entries.find(
        (e) => e.entryName.endsWith('SKILL.md') && !e.isDirectory,
      );
      if (!skillMd) {
        throw new AppError(400, ErrorCode.PACKAGE_NO_SKILL_MD, 'Zip must contain SKILL.md');
      }

      // Validate frontmatter
      const content = skillMd.getData().toString('utf8');
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) {
        throw new AppError(400, ErrorCode.VALIDATION_FAILED, 'SKILL.md must have YAML frontmatter');
      }

      const frontmatter = parseYaml(fmMatch[1], { maxAliasCount: 100 });
      if (!frontmatter.name || !frontmatter.description) {
        throw new AppError(400, ErrorCode.VALIDATION_FAILED, 'SKILL.md frontmatter must have name and description');
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(400, ErrorCode.PACKAGE_INVALID_ZIP, 'Invalid zip file');
    }

    // Dedup check
    const existing = await prisma.skillPackage.findUnique({
      where: {
        skillVersionId_agentType: {
          skillVersionId: skillVersion.id,
          agentType,
        },
      },
    });
    if (existing) {
      throw new AppError(409, ErrorCode.PACKAGE_CONFLICT, 'Package for this agent type already exists');
    }

    // Store
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const storageKey = `${skill.name}/${skillVersion.version}/${skill.name}-${skillVersion.version}-${agentType}.zip`;

    await storage.save(storageKey, buffer);

    const pkg = await prisma.skillPackage.create({
      data: {
        skillVersionId: skillVersion.id,
        agentType,
        filePath: storageKey,
        fileSize: buffer.length,
        checksumSha256: checksum,
      },
    });

    request.log.info({ userId, skillName: pv.data.name, version: pv.data.version, agentType, fileSize: buffer.length }, 'Package uploaded');

    return reply.status(201).send({
      ...pkg,
      fileSize: Number(pkg.fileSize),
    });
  });

  // Download specific version package
  app.get('/:name/versions/:version/packages/:agent', async (request, reply) => {
    const pv = validate(NameVersionAgentParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);
    const { name, version, agent } = pv.data;

    const skill = await getSkillOrThrow(name);
    const skillVersion = await getVersionOrThrow(skill.id, version);

    return sendPackageDownload(skill, skillVersion, agent, request, reply);
  });

  // Download latest version package
  app.get('/:name/latest/:agent', async (request, reply) => {
    const pv = validate(NameVersionAgentParamSchema.pick({ name: true, agent: true }), request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);
    const { name, agent } = pv.data;

    const skill = await getSkillOrThrow(name);
    const latestVersion = await prisma.skillVersion.findFirst({
      where: { skillId: skill.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!latestVersion) throw new AppError(404, ErrorCode.VERSION_NOT_FOUND, 'No versions found');

    return sendPackageDownload(skill, latestVersion, agent, request, reply);
  });

  // ─── Shared download logic ──────────────────────────
  async function sendPackageDownload(
    skill: { id: string; name: string },
    version: { id: string; version: string },
    agent: string,
    request: Parameters<Parameters<typeof app.get>[1]>[0],
    reply: Parameters<Parameters<typeof app.get>[1]>[1],
  ) {
    const pkg = await prisma.skillPackage.findUnique({
      where: { skillVersionId_agentType: { skillVersionId: version.id, agentType: agent } },
    });
    if (!pkg) throw new AppError(404, ErrorCode.PACKAGE_NOT_FOUND, 'Package not found');

    const buffer = await storage.get(pkg.filePath);
    await recordDownload(skill.id, pkg.id, request);

    return reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="${skill.name}-${version.version}-${agent}.zip"`)
      .header('X-Checksum-SHA256', pkg.checksumSha256)
      .send(buffer);
  }
}

// ─── Helper ─────────────────────────────────────────────
async function recordDownload(
  skillId: string,
  packageId: string,
  request: { ip?: string; headers: Record<string, string | string[] | undefined>; log: { error: (obj: Record<string, unknown>, msg: string) => void; debug: (obj: Record<string, unknown>, msg: string) => void } },
) {
  const ipHash = createHash('sha256')
    .update(request.ip || 'unknown')
    .digest('hex');

  try {
    await prisma.$transaction([
      prisma.downloadStat.create({
        data: {
          skillPackageId: packageId,
          ipHash,
          userAgent:
            typeof request.headers['user-agent'] === 'string'
              ? request.headers['user-agent'].slice(0, 255)
              : undefined,
        },
      }),
      prisma.skill.update({
        where: { id: skillId },
        data: { downloadCount: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    request.log.error({ skillId, packageId, err }, 'Failed to record download stat');
  }
}
