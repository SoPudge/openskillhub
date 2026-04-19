import { prisma } from './prisma.js';
import { AppError, ErrorCode } from './errors.js';
import { createStorage } from '../storage/index.js';

// ─── Admin Check ────────────────────────────────────────

export async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, banned: true },
  });
  if (!user) throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Authentication required');
  if (user.banned) throw new AppError(403, ErrorCode.USER_BANNED, 'Account is banned');
  if (user.role !== 'admin') throw new AppError(403, ErrorCode.ADMIN_REQUIRED, 'Admin access required');
  return user;
}

// ─── Skill Lookup ───────────────────────────────────────

export async function getSkillOrThrow(name: string) {
  const skill = await prisma.skill.findUnique({ where: { name } });
  if (!skill) throw new AppError(404, ErrorCode.SKILL_NOT_FOUND, 'Skill not found');
  return skill;
}

export function assertSkillAuthor(skill: { authorId: string }, userId: string) {
  if (skill.authorId !== userId) {
    throw new AppError(403, ErrorCode.SKILL_NOT_AUTHOR, 'Not the skill author');
  }
}

// ─── Version Lookup ─────────────────────────────────────

export async function getVersionOrThrow(skillId: string, version: string) {
  const v = await prisma.skillVersion.findUnique({
    where: { skillId_version: { skillId, version } },
  });
  if (!v) throw new AppError(404, ErrorCode.VERSION_NOT_FOUND, 'Version not found');
  return v;
}

// ─── Skill Delete with Storage Cleanup ──────────────────

export async function deleteSkillWithCleanup(
  skillId: string,
  log: { error: (obj: Record<string, unknown>, msg: string) => void },
): Promise<number> {
  const packages = await prisma.skillPackage.findMany({
    where: { skillVersion: { skillId } },
    select: { filePath: true },
  });

  await prisma.skill.delete({ where: { id: skillId } });

  if (packages.length > 0) {
    const storage = createStorage();
    const results = await Promise.allSettled(packages.map((pkg) => storage.delete(pkg.filePath)));
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      log.error({ skillId, failedCount: failed.length }, 'Storage cleanup partially failed');
    }
  }

  return packages.length;
}

// ─── Team Permission ────────────────────────────────────

export async function getTeamOrThrow(slug: string) {
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) throw new AppError(404, ErrorCode.TEAM_NOT_FOUND, 'Team not found');
  return team;
}

export async function assertTeamRole(
  teamId: string,
  userId: string,
  requiredRoles: string[],
  errorCode: ErrorCode,
  errorMessage: string,
) {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!membership || !requiredRoles.includes(membership.role)) {
    throw new AppError(403, errorCode, errorMessage);
  }
  return membership;
}

// ─── Tag Helpers ────────────────────────────────────────

export function slugifyTag(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export async function upsertTags(tags: string[]) {
  // Batch upsert: create missing tags in one transaction, then resolve IDs
  const tagData = tags.map((name) => ({ name, slug: slugifyTag(name) }));

  await prisma.$transaction(
    tagData.map(({ name, slug }) =>
      prisma.tag.upsert({ where: { slug }, update: {}, create: { name, slug } }),
    ),
  );

  const resolved = await prisma.tag.findMany({
    where: { slug: { in: tagData.map((t) => t.slug) } },
    select: { id: true },
  });

  return resolved.map((tag) => ({ tagId: tag.id }));
}

// ─── Full-Text Search ───────────────────────────────────

export async function fullTextSearchIds(q: string): Promise<string[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  // Build tsquery for 'simple' config (supports CJK + Latin)
  const words = trimmed.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}_-]/gu, '')).filter(Boolean);
  const tsQuery = words.map((w) => `${w}:*`).join(' & ');

  if (tsQuery) {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM skills WHERE search_vector @@ to_tsquery('simple', $1)`,
      tsQuery,
    );
    if (rows.length > 0) return rows.map((r) => r.id);
  }

  // ILIKE fallback for partial / CJK matches not caught by tsvector
  const pattern = `%${trimmed.replace(/[%_\\]/g, '\\$&')}%`;
  const fallbackRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM skills WHERE name ILIKE $1 OR display_name ILIKE $1 OR description ILIKE $1 LIMIT 200`,
    pattern,
  );
  return fallbackRows.map((r) => r.id);
}

// ─── BigInt / Format Helpers ────────────────────────────

export function buildSkillOrderBy(sort?: string): Record<string, string> {
  if (sort === 'downloads') return { downloadCount: 'desc' };
  if (sort === 'updated') return { updatedAt: 'desc' };
  if (sort === 'name') return { name: 'asc' };
  if (sort === 'created') return { createdAt: 'asc' };
  return { createdAt: 'desc' };
}

export function normalizeFileSize(pkg: { fileSize: bigint | number }) {
  return { ...pkg, fileSize: Number(pkg.fileSize ?? 0) };
}

export function formatSkill(skill: Record<string, unknown>) {
  const s = { ...skill } as Record<string, unknown>;
  s.downloadCount = Number(s.downloadCount ?? 0);
  s.tags = Array.isArray(s.tags)
    ? s.tags.map((t: Record<string, unknown>) => (t as Record<string, unknown>).tag ?? t)
    : undefined;
  if (Array.isArray(s.versions)) {
    s.versions = (s.versions as Record<string, unknown>[]).map((v) => ({
      ...v,
      packages: Array.isArray((v as Record<string, unknown>).packages)
        ? ((v as Record<string, unknown>).packages as Record<string, unknown>[]).map((p) => ({
            ...p,
            fileSize: Number((p as Record<string, unknown>).fileSize ?? 0),
          }))
        : (v as Record<string, unknown>).packages,
    }));
  }
  return s;
}
