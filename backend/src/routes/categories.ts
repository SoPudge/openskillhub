import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function categoryRoutes(app: FastifyInstance) {
  // List categories (tree)
  app.get('/categories', async () => {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { skills: true } } },
    });

    // Build tree
    const map = new Map<string, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];

    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        const parent = map.get(cat.parentId)!;
        (parent.children as Record<string, unknown>[]).push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  });

  // List tags
  app.get('/tags', async () => {
    return prisma.tag.findMany({ orderBy: { name: 'asc' } });
  });

  // Popular tags
  app.get('/tags/popular', async () => {
    const tags = await prisma.tag.findMany({
      include: { _count: { select: { skills: true } } },
      orderBy: { skills: { _count: 'desc' } },
      take: 20,
    });
    return tags.map((t) => ({ ...t, skillCount: t._count.skills }));
  });
}
