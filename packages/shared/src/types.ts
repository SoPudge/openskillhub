import type { AgentType, Visibility, TeamRole } from './constants';

// ─── User ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// ─── Team ───────────────────────────────────────────────
export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
}

// ─── Skill ──────────────────────────────────────────────
export interface Skill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  authorId: string;
  teamId?: string;
  categoryId?: string;
  visibility: Visibility;
  homepageUrl?: string;
  license?: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillVersion {
  id: string;
  skillId: string;
  version: string;
  changelog?: string;
  createdAt: string;
}

export interface SkillPackage {
  id: string;
  skillVersionId: string;
  agentType: AgentType;
  filePath: string;
  fileSize: number;
  checksumSha256: string;
  createdAt: string;
}

// ─── Category & Tag ─────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// ─── API Request/Response ───────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SkillSearchParams extends PaginationParams {
  q?: string;
  category?: string;
  tag?: string;
  agent?: AgentType;
  visibility?: Visibility;
  sort?: 'downloads' | 'newest' | 'updated' | 'name';
}

export interface CheckUpdatesRequest {
  installed: {
    name: string;
    version: string;
    agent: AgentType;
  }[];
}

export interface CheckUpdatesResponse {
  updates: {
    name: string;
    current: string;
    latest: string;
    changelog?: string;
  }[];
}

export interface CreateSkillRequest {
  name: string;
  displayName: string;
  description: string;
  categoryId?: string;
  visibility?: Visibility;
  homepageUrl?: string;
  license?: string;
  tags?: string[];
}

export interface CreateVersionRequest {
  version: string;
  changelog?: string;
}
