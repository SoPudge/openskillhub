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

/** Agent metadata: install paths, descriptions, links */
export interface AgentMeta {
  label: string;
  url: string;
  installPaths: string[];
  description: string;
}

export const AGENT_META: Record<AgentType, AgentMeta> = {
  opencode: {
    label: 'OpenCode',
    url: 'https://github.com/anomalyco/opencode',
    installPaths: ['.opencode/skills/', '~/.config/opencode/skills/'],
    description: 'Agent Skills 标准, 支持 allowed-tools 和原生 skill 按需加载',
  },
  openclaw: {
    label: 'OpenClaw',
    url: 'https://github.com/openclaw/openclaw',
    installPaths: ['<workspace>/skills/', '~/.openclaw/skills/', '~/.agents/skills/'],
    description: 'AgentSkills 兼容 + metadata.openclaw 扩展 (依赖检测, 环境过滤)',
  },
  'claude-code': {
    label: 'Claude Code',
    url: 'https://code.claude.com',
    installPaths: ['~/.claude/skills/', '.claude/skills/'],
    description: 'Agent Skills 标准 + 扩展 frontmatter (context, agent, hooks)',
  },
  cursor: {
    label: 'Cursor',
    url: 'https://cursor.com',
    installPaths: ['.cursor/skills/'],
    description: 'Agent Skills 兼容, 通过 .cursor/skills/ 目录加载',
  },
  goose: {
    label: 'Goose',
    url: 'https://github.com/block/goose',
    installPaths: ['~/.config/goose/skills/'],
    description: 'Agent Skills 标准',
  },
  amp: {
    label: 'Amp',
    url: 'https://ampcode.com',
    installPaths: ['~/.amp/skills/'],
    description: 'Agent Skills 标准',
  },
};

export const VISIBILITY_TYPES = ['public', 'team', 'private'] as const;
export type Visibility = (typeof VISIBILITY_TYPES)[number];

export const TEAM_ROLES = ['owner', 'admin', 'member'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];
