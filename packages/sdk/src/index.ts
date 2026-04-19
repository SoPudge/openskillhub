export { OpenSkillHubClient } from './client.js';
export type { ClientOptions, LoginResponse, RegisterResponse, ApiKeyCreateResponse, DownloadStats, SkillDetail } from './client.js';
export { OpenSkillHubError } from './errors.js';

// Re-export commonly used types from shared
export type {
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
