export const AGENT_TYPES = [
  'opencode',
  'openclaw',
  'claude-code',
  'cursor',
  'goose',
  'amp',
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const VISIBILITY_TYPES = ['public', 'team', 'private'] as const;
export type Visibility = (typeof VISIBILITY_TYPES)[number];

export const TEAM_ROLES = ['owner', 'admin', 'member'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
