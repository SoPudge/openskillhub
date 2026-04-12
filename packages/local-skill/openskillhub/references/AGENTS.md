# Agent Skill Installation Paths

This reference lists where skills are installed for each supported AI agent.

## OpenCode

| Scope | Path |
|-------|------|
| Global | `~/.config/opencode/skills/<skill-name>/` |
| Project | `.opencode/skills/<skill-name>/` |
| Standard | `.agents/skills/<skill-name>/` |

## OpenClaw

| Scope | Path |
|-------|------|
| Global | `~/.openclaw/skills/<skill-name>/` |
| Global (shared) | `~/.agents/skills/<skill-name>/` |
| Project | `<workspace>/skills/<skill-name>/` |
| Project (alt) | `<workspace>/.agents/skills/<skill-name>/` |

OpenClaw also supports `skills.load.extraDirs` configuration and `{baseDir}` placeholder.

## Claude Code

| Scope | Path |
|-------|------|
| Global | `~/.claude/skills/<skill-name>/` |
| Project | `.claude/skills/<skill-name>/` |

## Cursor

| Scope | Path |
|-------|------|
| Global | `~/.cursor/skills/<skill-name>/` (convention) |
| Project | `.cursor/skills/<skill-name>/` (convention) |

## Notes

- Global paths store skills available across all projects.
- Project paths make skills available only within that workspace.
- The `osh.sh install` command uses `--agent` flag (or `default_agent` config) to determine which path to use.
- By default, skills are installed to the **global** path.
