import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { validate, NameParamSchema, StatsQuerySchema } from '../lib/validation.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { getSkillOrThrow } from '../lib/helpers.js';

export async function statsRoutes(app: FastifyInstance) {
  // Download stats for a skill
  app.get('/:name/stats', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, pv.error);

    const qv = validate(StatsQuerySchema, request.query);
    if (!qv.success) throw new AppError(400, ErrorCode.VALIDATION_FAILED, qv.error);

    const { period, days } = qv.data;

    const skill = await prisma.skill.findUnique({
      where: { name: pv.data.name },
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
