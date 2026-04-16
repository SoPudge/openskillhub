import type { Category, Skill } from '@openskillhub/shared';

/** Category with skill count (from API include _count) */
export interface CategoryWithCount extends Category {
  _count: { skills: number };
  children?: CategoryWithCount[];
}

/** Skill with relations as returned by list / detail endpoints */
export interface SkillWithMeta extends Skill {
  author: { username: string; displayName?: string };
  category?: { name: string; slug: string };
  tags?: { name: string; slug: string }[];
  versions?: {
    id: string;
    version: string;
    changelog?: string;
    createdAt: string;
    packages: { agentType: string; fileSize: number; checksumSha256?: string }[];
  }[];
}

/** Team with relations as returned by GET /teams/:slug */
export interface TeamDetail {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  owner: { id: string; username: string; displayName?: string };
  members: { role: string; joinedAt: string; user: { id: string; username: string; displayName?: string } }[];
  _count: { skills: number };
}
