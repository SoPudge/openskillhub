import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { validate, NameParamSchema, StatsQuerySchema } from '../lib/validation.js';

export async function statsRoutes(app: FastifyInstance) {
  // Download stats for a skill
  app.get('/:name/stats', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const pv = validate(NameParamSchema, request.params);
    if (!pv.success) return reply.status(400).send({ error: pv.error });

    const qv = validate(StatsQuerySchema, request.query);
    if (!qv.success) return reply.status(400).send({ error: qv.error });

    const { period, days } = qv.data;

    const skill = await prisma.skill.findUnique({
      where: { name: pv.data.name },
      select: { id: true, downloadCount: true },
    });
    if (!skill) return reply.status(404).send({ error: 'Skill not found' });

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all package IDs for this skill
    const packages = await prisma.skillPackage.findMany({
      where: { skillVersion: { skillId: skill.id } },
      select: { id: true },
    });
    const packageIds = packages.map((p) => p.id);

    if (packageIds.length === 0) {
      return {
        totalDownloads: Number(skill.downloadCount),
        period,
        days,
        timeline: [],
        byAgent: [],
      };
    }

    // Aggregate by time period using raw SQL for efficiency
    let truncExpr: string;
    if (period === 'week') truncExpr = `date_trunc('week', created_at)`;
    else if (period === 'month') truncExpr = `date_trunc('month', created_at)`;
    else truncExpr = `date_trunc('day', created_at)`;

    const timeline = await prisma.$queryRawUnsafe<{ date: Date; count: bigint }[]>(
      `SELECT ${truncExpr} AS date, COUNT(*)::bigint AS count
       FROM download_stats
       WHERE skill_package_id = ANY($1::uuid[]) AND created_at >= $2
       GROUP BY date ORDER BY date ASC`,
      packageIds,
      since,
    );

    // Per-agent breakdown
    const byAgent = await prisma.$queryRawUnsafe<{ agent_type: string; count: bigint }[]>(
      `SELECT sp.agent_type, COUNT(*)::bigint AS count
       FROM download_stats ds
       JOIN skill_packages sp ON ds.skill_package_id = sp.id
       WHERE sp.id = ANY($1::uuid[]) AND ds.created_at >= $2
       GROUP BY sp.agent_type ORDER BY count DESC`,
      packageIds,
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
