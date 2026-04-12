#!/usr/bin/env bash
# osh.sh — OpenSkillHub CLI wrapper
# Usage: bash osh.sh <command> [args...]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${OSH_CONFIG_DIR:-$HOME/.config/openskillhub}"
CONFIG_FILE="$CONFIG_DIR/config.json"
INSTALLED_FILE="$CONFIG_DIR/installed.json"
CACHE_DIR="$CONFIG_DIR/cache"

# ─── Helpers ────────────────────────────────────────────

ensure_config() {
  mkdir -p "$CONFIG_DIR" "$CACHE_DIR"
  [[ -f "$CONFIG_FILE" ]] || cat > "$CONFIG_FILE" <<'EOF'
{
  "hub_url": "http://localhost:3001/api/v1",
  "api_key": "",
  "default_agent": "opencode",
  "auto_update_check": true
}
EOF
  [[ -f "$INSTALLED_FILE" ]] || echo '{"skills":[]}' > "$INSTALLED_FILE"
}

cfg_get() {
  local key="$1"
  python3 -c "import json,sys; d=json.load(open('$CONFIG_FILE')); print(d.get('$key',''))" 2>/dev/null \
    || echo ""
}

cfg_set() {
  local key="$1" value="$2"
  python3 -c "
import json, sys
with open('$CONFIG_FILE','r') as f: d=json.load(f)
d['$key']='$value'
with open('$CONFIG_FILE','w') as f: json.dump(d,f,indent=2)
print('Set $key = $value')
"
}

hub_url() { cfg_get hub_url; }
api_key() { cfg_get api_key; }
default_agent() { cfg_get default_agent; }

api_headers() {
  local key
  key="$(api_key)"
  if [[ -n "$key" ]]; then
    echo "-H" "X-API-Key: $key"
  fi
}

agent_install_path() {
  local agent="${1:-$(default_agent)}"
  case "$agent" in
    opencode)    echo "$HOME/.config/opencode/skills" ;;
    openclaw)    echo "$HOME/.openclaw/skills" ;;
    claude-code) echo "$HOME/.claude/skills" ;;
    cursor)      echo "$HOME/.cursor/skills" ;;
    *)           echo "$HOME/.agents/skills" ;;
  esac
}

# ─── Commands ───────────────────────────────────────────

cmd_search() {
  local query="${1:-}"
  if [[ -z "$query" ]]; then
    echo "Usage: osh.sh search <query>"
    exit 1
  fi
  local url
  url="$(hub_url)/skills?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")"
  local result
  result=$(curl -sf "$url" $(api_headers) 2>/dev/null || echo '{"data":[]}')
  echo "$result" | python3 -c "
import json, sys
data = json.load(sys.stdin)
skills = data.get('data', [])
if not skills:
    print('No skills found.')
else:
    for s in skills:
        dl = s.get('downloadCount', 0)
        desc = (s.get('description','') or '')[:80]
        print(f\"  {s['name']:30s}  {dl:>6d} dl  {desc}\")
    total = data.get('total', len(skills))
    print(f'\n{total} skill(s) found.')
"
}

cmd_install() {
  local name="${1:-}"
  local agent="${2:-$(default_agent)}"
  if [[ -z "$name" ]]; then
    echo "Usage: osh.sh install <skill-name> [--agent <agent>]"
    exit 1
  fi

  local dest
  dest="$(agent_install_path "$agent")/$name"
  mkdir -p "$(agent_install_path "$agent")"

  echo "Installing $name for $agent..."

  local url
  url="$(hub_url)/skills/$name/latest/$agent"
  local zip_path="$CACHE_DIR/${name}-${agent}.zip"

  if ! curl -sf "$url" $(api_headers) -o "$zip_path"; then
    echo "Error: Failed to download $name for $agent"
    exit 1
  fi

  # Extract
  rm -rf "$dest"
  mkdir -p "$dest"
  if command -v unzip &>/dev/null; then
    unzip -qo "$zip_path" -d "$dest"
  elif command -v python3 &>/dev/null; then
    python3 -c "import zipfile; zipfile.ZipFile('$zip_path').extractall('$dest')"
  else
    echo "Error: No unzip or python3 available"
    exit 1
  fi

  # Get version info
  local version
  version=$(curl -sf "$(hub_url)/skills/$name" $(api_headers) 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin); vs=d.get('versions',[]); print(vs[0]['version'] if vs else 'unknown')" 2>/dev/null || echo "unknown")

  # Update installed.json
  python3 -c "
import json, datetime
with open('$INSTALLED_FILE','r') as f: data=json.load(f)
skills = data.get('skills', [])
skills = [s for s in skills if not (s['name']=='$name' and s['agent']=='$agent')]
skills.append({
  'name': '$name',
  'version': '$version',
  'agent': '$agent',
  'install_path': '$dest',
  'installed_at': datetime.datetime.utcnow().isoformat() + 'Z'
})
data['skills'] = skills
with open('$INSTALLED_FILE','w') as f: json.dump(data,f,indent=2)
"
  echo "Installed $name v$version → $dest"
}

cmd_update() {
  local name="${1:-}"
  local agent
  agent="$(default_agent)"

  if [[ -n "$name" ]]; then
    # Update single skill
    local current_version
    current_version=$(python3 -c "
import json
with open('$INSTALLED_FILE') as f: data=json.load(f)
for s in data.get('skills',[]):
    if s['name']=='$name':
        print(s['version']); break
else:
    print('')
" 2>/dev/null || echo "")
    if [[ -z "$current_version" ]]; then
      echo "Skill $name is not installed. Use 'install' first."
      exit 1
    fi
    # Check for update
    local result
    result=$(curl -sf "$(hub_url)/skills/check-updates" $(api_headers) \
      -X POST -H "Content-Type: application/json" \
      -d "{\"skills\":[{\"name\":\"$name\",\"version\":\"$current_version\"}]}" 2>/dev/null || echo '{"updates":[]}')
    local has_update
    has_update=$(echo "$result" | python3 -c "
import json,sys
data=json.load(sys.stdin)
updates=[u for u in data.get('updates',[]) if u.get('hasUpdate')]
if updates:
    print(updates[0].get('latestVersion',''))
else:
    print('')
" 2>/dev/null || echo "")
    if [[ -n "$has_update" ]]; then
      echo "Updating $name from $current_version to $has_update..."
      cmd_install "$name" "$agent"
    else
      echo "$name is already up to date ($current_version)."
    fi
  else
    # Check all installed skills
    echo "Checking for updates..."
    local payload
    payload=$(python3 -c "
import json
with open('$INSTALLED_FILE') as f: data=json.load(f)
skills = [{'name':s['name'],'version':s['version']} for s in data.get('skills',[])]
print(json.dumps({'skills':skills}))
" 2>/dev/null || echo '{"skills":[]}')

    local result
    result=$(curl -sf "$(hub_url)/skills/check-updates" $(api_headers) \
      -X POST -H "Content-Type: application/json" -d "$payload" 2>/dev/null || echo '{"updates":[]}')

    echo "$result" | python3 -c "
import json, sys
data = json.load(sys.stdin)
updates = [u for u in data.get('updates',[]) if u.get('hasUpdate')]
if not updates:
    print('All skills are up to date.')
else:
    for u in updates:
        print(f\"  {u['name']}: {u['currentVersion']} → {u['latestVersion']}\")
    print(f'\n{len(updates)} update(s) available. Run: osh.sh update <name>')
"
  fi
}

cmd_remove() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "Usage: osh.sh remove <skill-name>"
    exit 1
  fi

  local path
  path=$(python3 -c "
import json
with open('$INSTALLED_FILE') as f: data=json.load(f)
for s in data.get('skills',[]):
    if s['name']=='$name':
        print(s['install_path']); break
else:
    print('')
" 2>/dev/null || echo "")

  if [[ -z "$path" ]]; then
    echo "Skill $name is not installed."
    exit 1
  fi

  rm -rf "$path"

  python3 -c "
import json
with open('$INSTALLED_FILE','r') as f: data=json.load(f)
data['skills'] = [s for s in data.get('skills',[]) if s['name']!='$name']
with open('$INSTALLED_FILE','w') as f: json.dump(data,f,indent=2)
"
  echo "Removed $name ($path)"
}

cmd_list() {
  python3 -c "
import json
with open('$INSTALLED_FILE') as f: data=json.load(f)
skills = data.get('skills', [])
if not skills:
    print('No skills installed.')
else:
    for s in skills:
        print(f\"  {s['name']:30s}  v{s['version']:10s}  {s['agent']:12s}  {s['install_path']}\")
    print(f'\n{len(skills)} skill(s) installed.')
"
}

cmd_info() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "Usage: osh.sh info <skill-name>"
    exit 1
  fi
  local result
  result=$(curl -sf "$(hub_url)/skills/$name" $(api_headers) 2>/dev/null || echo "")
  if [[ -z "$result" ]]; then
    echo "Skill $name not found on Hub."
    exit 1
  fi
  echo "$result" | python3 -c "
import json, sys
s = json.load(sys.stdin)
print(f\"Name:        {s['name']}\")
print(f\"Display:     {s.get('displayName', s['name'])}\")
print(f\"Description: {s.get('description','N/A')}\")
print(f\"Author:      @{s.get('author',{}).get('username','unknown')}\")
print(f\"License:     {s.get('license','N/A')}\")
print(f\"Downloads:   {s.get('downloadCount',0)}\")
vs = s.get('versions',[])
if vs:
    latest = vs[0]
    agents = ', '.join(set(p['agentType'] for p in latest.get('packages',[])))
    print(f\"Latest:      v{latest['version']}  ({agents})\")
    print(f\"Published:   {latest.get('createdAt','')[:10]}\")
"
}

cmd_publish() {
  local skill_dir="${1:-}"
  local agent="${2:-$(default_agent)}"
  if [[ -z "$skill_dir" ]]; then
    echo "Usage: osh.sh publish <skill-dir> [agent-type]"
    exit 1
  fi

  if [[ ! -f "$skill_dir/SKILL.md" ]]; then
    echo "Error: $skill_dir/SKILL.md not found"
    exit 1
  fi

  # Parse SKILL.md frontmatter
  local name version
  name=$(python3 -c "
import re
with open('$skill_dir/SKILL.md') as f: content=f.read()
m = re.search(r'^name:\s*(.+)', content, re.MULTILINE)
print(m.group(1).strip() if m else '')
" 2>/dev/null || echo "")
  version=$(python3 -c "
import re
with open('$skill_dir/SKILL.md') as f: content=f.read()
m = re.search(r'version:\s*[\"'\'']*([^\"'\''\\n]+)', content, re.MULTILINE)
print(m.group(1).strip() if m else '0.1.0')
" 2>/dev/null || echo "0.1.0")

  if [[ -z "$name" ]]; then
    echo "Error: Could not parse 'name' from SKILL.md frontmatter"
    exit 1
  fi

  echo "Publishing $name v$version for $agent..."

  # Create zip
  local zip_path="$CACHE_DIR/${name}-${version}-${agent}.zip"
  if command -v zip &>/dev/null; then
    (cd "$skill_dir" && zip -qr "$zip_path" .)
  elif command -v python3 &>/dev/null; then
    python3 -c "
import zipfile, os
with zipfile.ZipFile('$zip_path','w',zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('$skill_dir'):
        for f in files:
            fp = os.path.join(root, f)
            arc = os.path.relpath(fp, '$skill_dir')
            z.write(fp, arc)
"
  else
    echo "Error: No zip or python3 available"
    exit 1
  fi

  local key
  key="$(api_key)"
  if [[ -z "$key" ]]; then
    echo "Error: API key not configured. Run: osh.sh config set api_key <your-key>"
    exit 1
  fi

  # Upload
  local url
  url="$(hub_url)/skills/$name/versions/$version/packages"
  local result
  result=$(curl -sf "$url" \
    -H "X-API-Key: $key" \
    -F "agent=$agent" \
    -F "file=@$zip_path" 2>/dev/null || echo "")

  if [[ -z "$result" ]]; then
    echo "Error: Upload failed. Make sure the skill and version exist on the Hub."
    echo "  Create skill: curl -X POST $(hub_url)/skills -H 'X-API-Key: $key' -H 'Content-Type: application/json' -d '{\"name\":\"$name\",\"displayName\":\"$name\"}'"
    echo "  Create version: curl -X POST $(hub_url)/skills/$name/versions -H 'X-API-Key: $key' -H 'Content-Type: application/json' -d '{\"version\":\"$version\"}'"
    exit 1
  fi

  echo "Published $name v$version for $agent"
  rm -f "$zip_path"
}

cmd_rollback() {
  local name="${1:-}" version="${2:-}"
  if [[ -z "$name" || -z "$version" ]]; then
    echo "Usage: osh.sh rollback <skill-name> <version>"
    exit 1
  fi
  local agent
  agent="$(default_agent)"

  local dest
  dest="$(agent_install_path "$agent")/$name"

  echo "Rolling back $name to v$version..."
  local url
  url="$(hub_url)/skills/$name/versions/$version/packages/$agent"
  local zip_path="$CACHE_DIR/${name}-${version}-${agent}.zip"

  if ! curl -sf "$url" $(api_headers) -o "$zip_path"; then
    echo "Error: Failed to download $name v$version for $agent"
    exit 1
  fi

  rm -rf "$dest"
  mkdir -p "$dest"
  if command -v unzip &>/dev/null; then
    unzip -qo "$zip_path" -d "$dest"
  else
    python3 -c "import zipfile; zipfile.ZipFile('$zip_path').extractall('$dest')"
  fi

  python3 -c "
import json, datetime
with open('$INSTALLED_FILE','r') as f: data=json.load(f)
for s in data.get('skills',[]):
    if s['name']=='$name' and s['agent']=='$agent':
        s['version']='$version'
        s['installed_at']=datetime.datetime.utcnow().isoformat()+'Z'
        break
with open('$INSTALLED_FILE','w') as f: json.dump(data,f,indent=2)
"
  echo "Rolled back $name to v$version → $dest"
}

cmd_config() {
  local action="${1:-}" key="${2:-}" value="${3:-}"
  case "$action" in
    set)
      if [[ -z "$key" || -z "$value" ]]; then
        echo "Usage: osh.sh config set <key> <value>"
        echo "Keys: hub_url, api_key, default_agent, auto_update_check"
        exit 1
      fi
      cfg_set "$key" "$value"
      ;;
    get)
      if [[ -z "$key" ]]; then
        echo "Current config:"
        cat "$CONFIG_FILE" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  {k}: {v}') for k,v in d.items()]"
      else
        cfg_get "$key"
      fi
      ;;
    *)
      echo "Usage: osh.sh config <get|set> [key] [value]"
      ;;
  esac
}

# ─── Main ───────────────────────────────────────────────

ensure_config

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  search)   cmd_search "$@" ;;
  install)
    # Parse --agent flag
    args=() agent=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --agent) agent="$2"; shift 2 ;;
        *) args+=("$1"); shift ;;
      esac
    done
    cmd_install "${args[0]:-}" "${agent:-$(default_agent)}"
    ;;
  update)   cmd_update "$@" ;;
  remove)   cmd_remove "$@" ;;
  list)     cmd_list ;;
  info)     cmd_info "$@" ;;
  publish)  cmd_publish "$@" ;;
  rollback) cmd_rollback "$@" ;;
  config)   cmd_config "$@" ;;
  help|*)
    echo "OpenSkillHub — AI Agent Skill Manager"
    echo ""
    echo "Usage: osh.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  search <query>          Search for skills"
    echo "  install <name> [--agent <type>]  Install a skill"
    echo "  update [name]           Check/apply updates"
    echo "  remove <name>           Remove a skill"
    echo "  list                    List installed skills"
    echo "  info <name>             View skill details"
    echo "  publish <dir> [agent]   Publish a skill"
    echo "  rollback <name> <ver>   Rollback to a version"
    echo "  config <get|set> [k] [v] Manage configuration"
    ;;
esac
