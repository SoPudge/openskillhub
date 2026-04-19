export const AGENT_TYPES = [
  'opencode',
  'openclaw',
  'claude-code',
  'cursor',
  'goose',
  'amp',
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

/** Human-readable labels for each agent type */
export const AGENT_LABELS: Record<AgentType, string> = {
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  goose: 'Goose',
  amp: 'Amp',
};

export const VISIBILITY_TYPES = ['public', 'team', 'private'] as const;
export type Visibility = (typeof VISIBILITY_TYPES)[number];

export const TEAM_ROLES = ['owner', 'admin', 'member'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];
