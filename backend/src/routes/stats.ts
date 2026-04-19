import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { validateOrThrow, NameParamSchema, StatsQuerySchema } from '../lib/validation.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { getSkillOrThrow } from '../lib/helpers.js';

export async function statsRoutes(app: FastifyInstance) {
  // Download stats for a skill
  app.get('/:name/stats', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { name } = validateOrThrow(NameParamSchema, request.params);
    const { period, days } = validateOrThrow(StatsQuerySchema, request.query);

    const skill = await prisma.skill.findUnique({
      where: { name },
      select: { id: true, downloadCount: true },
    });
    if (!skill) throw new AppError(404, ErrorCode.SKILL_NOT_FOUND, 'Skill not found');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Check if skill has any packages (without fetching all IDs)
    const packageCount = await prisma.skillPackage.count({
      where: { skillVersion: { skillId: skill.id } },
    });

    if (packageCount === 0) {
      return {
        totalDownloads: Number(skill.downloadCount),
        period,
        days,
        timeline: [],
        byAgent: [],
      };
    }

    // Aggregate by time period using raw SQL — join through skill_versions to avoid fetching IDs
    let truncExpr: string;
    if (period === 'week') truncExpr = `date_trunc('week', ds.created_at)`;
    else if (period === 'month') truncExpr = `date_trunc('month', ds.created_at)`;
    else truncExpr = `date_trunc('day', ds.created_at)`;

    const timeline = await prisma.$queryRawUnsafe<{ date: Date; count: bigint }[]>(
      `SELECT ${truncExpr} AS date, COUNT(*)::bigint AS count
       FROM download_stats ds
       JOIN skill_packages sp ON ds.skill_package_id = sp.id
       JOIN skill_versions sv ON sp.skill_version_id = sv.id
       WHERE sv.skill_id = $1::uuid AND ds.created_at >= $2
       GROUP BY date ORDER BY date ASC`,
      skill.id,
      since,
    );

    // Per-agent breakdown
    const byAgent = await prisma.$queryRawUnsafe<{ agent_type: string; count: bigint }[]>(
      `SELECT sp.agent_type, COUNT(*)::bigint AS count
       FROM download_stats ds
       JOIN skill_packages sp ON ds.skill_package_id = sp.id
       JOIN skill_versions sv ON sp.skill_version_id = sv.id
       WHERE sv.skill_id = $1::uuid AND ds.created_at >= $2
       GROUP BY sp.agent_type ORDER BY count DESC`,
      skill.id,
      since,
    );

    return {
      totalDownloads: Number(skill.downloadCount),
      period,
      days,
      timeline: timeline.map((r) => ({
        date: r.date.toISOString().split('T')[0],
        count: Number(r.count),
      })),
      byAgent: byAgent.map((r) => ({
        agentType: r.agent_type,
        count: Number(r.count),
      })),
    };
  });
}

// Global platform stats (registered separately)
export async function globalStatsRoutes(app: FastifyInstance) {
  app.get('/overview', async () => {
    const [skillCount, authorCount, agg] = await Promise.all([
      prisma.skill.count({ where: { visibility: 'public' } }),
      prisma.user.count(),
      prisma.skill.aggregate({ _sum: { downloadCount: true }, where: { visibility: 'public' } }),
    ]);
    return {
      skills: skillCount,
      authors: authorCount,
      downloads: Number(agg._sum.downloadCount ?? 0),
    };
  });
}
