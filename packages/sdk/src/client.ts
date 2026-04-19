import type {
  Skill,
  SkillVersion,
  SkillPackage,
  Category,
  Tag,
  Team,
  TeamMember,
  User,
  ApiKey,
  PaginatedResponse,
  SkillSearchParams,
  CreateSkillRequest,
  CreateVersionRequest,
  CheckUpdatesRequest,
  CheckUpdatesResponse,
  AgentType,
} from '@openskillhub/shared';
import { OpenSkillHubError } from './errors.js';

// ─── Options ────────────────────────────────────────────

export interface ClientOptions {
  /** Base URL of the API, e.g. "http://localhost:3001/api/v1" */
  baseUrl: string;
  /** JWT token for authenticated requests */
  token?: string;
  /** API key for authenticated requests (alternative to token) */
  apiKey?: string;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** Custom fetch implementation (default: globalThis.fetch) */
  fetch?: typeof globalThis.fetch;
}

// ─── Response types not in shared ───────────────────────

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  token: string;
  user: User;
}

export interface ApiKeyCreateResponse {
  apiKey: ApiKey;
  /** The full key string — only returned once at creation */
  key: string;
}

export interface DownloadStats {
  period: string;
  days: number;
  stats: { date: string; downloads: number }[];
}

export interface SkillDetail extends Skill {
  author?: { username: string; displayName?: string };
  category?: { name: string; slug: string };
  tags?: { name: string; slug: string }[];
  versions?: (SkillVersion & { packages: SkillPackage[] })[];
}

// ─── Client ─────────────────────────────────────────────

export class OpenSkillHubClient {
  private baseUrl: string;
  private token?: string;
  private apiKey?: string;
  private timeout: number;
  private fetchFn: typeof globalThis.fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 10000;
    this.fetchFn = options.fetch ?? globalThis.fetch;
  }

  // ── Auth ────────────────────────────────────────────

  /** Set JWT token for subsequent requests */
  setToken(token: string): void {
    this.token = token;
    this.apiKey = undefined;
  }

  /** Set API key for subsequent requests */
  setApiKey(key: string): void {
    this.apiKey = key;
    this.token = undefined;
  }

  /** Clear authentication */
  clearAuth(): void {
    this.token = undefined;
    this.apiKey = undefined;
  }

  // ── Auth API ────────────────────────────────────────

  async register(email: string, username: string, password: string, displayName?: string): Promise<RegisterResponse> {
    return this.post<RegisterResponse>('/auth/register', { email, username, password, displayName });
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.post<LoginResponse>('/auth/login', { email, password });
  }

  async me(): Promise<User> {
    return this.get<User>('/auth/me');
  }

  // ── API Keys ────────────────────────────────────────

  async listApiKeys(): Promise<ApiKey[]> {
    return this.get<ApiKey[]>('/auth/api-keys');
  }

  async createApiKey(name: string): Promise<ApiKeyCreateResponse> {
    return this.post<ApiKeyCreateResponse>('/auth/api-keys', { name });
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.delete(`/auth/api-keys/${id}`);
  }

  // ── Skills ──────────────────────────────────────────

  async listSkills(params?: SkillSearchParams): Promise<PaginatedResponse<Skill>> {
    const query = this.buildQuery(params as unknown as Record<string, unknown>);
    return this.get<PaginatedResponse<Skill>>(`/skills${query}`);
  }

  async getSkill(name: string): Promise<SkillDetail> {
    return this.get<SkillDetail>(`/skills/${encodeURIComponent(name)}`);
  }

  async createSkill(data: CreateSkillRequest): Promise<Skill> {
    return this.post<Skill>('/skills', data);
  }

  async updateSkill(name: string, data: Partial<CreateSkillRequest>): Promise<Skill> {
    return this.patch<Skill>(`/skills/${encodeURIComponent(name)}`, data);
  }

  async deleteSkill(name: string): Promise<void> {
    await this.delete(`/skills/${encodeURIComponent(name)}`);
  }

  async checkUpdates(installed: CheckUpdatesRequest['installed']): Promise<CheckUpdatesResponse> {
    return this.post<CheckUpdatesResponse>('/skills/check-updates', { installed });
  }

  // ── Versions ────────────────────────────────────────

  async listVersions(skillName: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<SkillVersion>> {
    const query = this.buildQuery(params);
    return this.get<PaginatedResponse<SkillVersion>>(`/skills/${encodeURIComponent(skillName)}/versions${query}`);
  }

  async createVersion(skillName: string, data: CreateVersionRequest): Promise<SkillVersion> {
    return this.post<SkillVersion>(`/skills/${encodeURIComponent(skillName)}/versions`, data);
  }

  // ── Packages ────────────────────────────────────────

  async uploadPackage(skillName: string, version: string, agentType: AgentType, file: Blob, filename: string): Promise<SkillPackage> {
    const url = `${this.baseUrl}/skills/${encodeURIComponent(skillName)}/versions/${encodeURIComponent(version)}/packages`;
    const form = new FormData();
    form.append('agent_type', agentType);
    form.append('file', file, filename);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout * 3); // longer for uploads

    try {
      const res = await this.fetchFn(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: form,
        signal: controller.signal,
      });
      return this.handleResponse<SkillPackage>(res);
    } finally {
      clearTimeout(timer);
    }
  }

  async downloadPackage(skillName: string, version: string, agentType: AgentType): Promise<ArrayBuffer> {
    const url = `/skills/${encodeURIComponent(skillName)}/versions/${encodeURIComponent(version)}/packages/${agentType}`;
    return this.getRaw(url);
  }

  async downloadLatestPackage(skillName: string, agentType: AgentType): Promise<ArrayBuffer> {
    const url = `/skills/${encodeURIComponent(skillName)}/latest/${agentType}`;
    return this.getRaw(url);
  }

  // ── Stats ───────────────────────────────────────────

  async getSkillStats(skillName: string, params?: { period?: string; days?: number }): Promise<DownloadStats> {
    const query = this.buildQuery(params);
    return this.get<DownloadStats>(`/skills/${encodeURIComponent(skillName)}/stats${query}`);
  }

  // ── Categories ──────────────────────────────────────

  async listCategories(): Promise<Category[]> {
    return this.get<Category[]>('/categories');
  }

  // ── Tags ────────────────────────────────────────────

  async listTags(): Promise<Tag[]> {
    return this.get<Tag[]>('/tags');
  }

  // ── Teams ───────────────────────────────────────────

  async listTeams(): Promise<Team[]> {
    return this.get<Team[]>('/teams');
  }

  async createTeam(name: string, slug: string): Promise<Team> {
    return this.post<Team>('/teams', { name, slug });
  }

  async getTeam(slug: string): Promise<Team & { members: (TeamMember & { user: Pick<User, 'username' | 'displayName'> })[] }> {
    return this.get(`/teams/${encodeURIComponent(slug)}`);
  }

  async addTeamMember(slug: string, username: string, role?: string): Promise<TeamMember> {
    return this.post<TeamMember>(`/teams/${encodeURIComponent(slug)}/members`, { username, role });
  }

  async removeTeamMember(slug: string, username: string): Promise<void> {
    await this.delete(`/teams/${encodeURIComponent(slug)}/members/${encodeURIComponent(username)}`);
  }

  // ── ClawHub Proxy ───────────────────────────────────

  async searchClawHub(q: string, limit?: number): Promise<{ results: { slug: string; displayName: string; summary: string; score: number }[] }> {
    const query = this.buildQuery({ q, limit });
    return this.get(`/clawhub/search${query}`);
  }

  async getClawHubSkill(slug: string): Promise<{ skill: Record<string, unknown>; latestVersion: Record<string, unknown> | null }> {
    return this.get(`/clawhub/skills/${encodeURIComponent(slug)}`);
  }

  // ── Internal HTTP helpers ───────────────────────────

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private buildQuery(params?: Record<string, unknown>): string {
    if (!params) return '';
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      };

      const res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      return this.handleResponse<T>(res);
    } finally {
      clearTimeout(timer);
    }
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errBody: { error?: string; code?: string } = {};
      try {
        errBody = await res.json() as { error?: string; code?: string };
      } catch {
        // ignore parse errors
      }
      throw new OpenSkillHubError(
        res.status,
        errBody.code,
        errBody.error || `API error ${res.status}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private async delete(path: string): Promise<void> {
    await this.request<void>('DELETE', path);
  }

  private async getRaw(path: string): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout * 3);

    try {
      const res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.authHeaders(),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errBody: { error?: string; code?: string } = {};
        try {
          errBody = await res.json() as { error?: string; code?: string };
        } catch {
          // ignore
        }
        throw new OpenSkillHubError(res.status, errBody.code, errBody.error || `API error ${res.status}`);
      }

      return res.arrayBuffer();
    } finally {
      clearTimeout(timer);
    }
  }
}
