---
name: openskillhub
description: |
  Manage AI agent skills from OpenSkillHub. Use when the user wants to search,
  install, update, remove, publish, or manage skills from the OpenSkillHub registry.
  Handles skill lifecycle including version management and multi-device sync.

  ## Available Commands

  ### Search for skills
  ```bash
  bash {baseDir}/scripts/osh.sh search "<query>"
  ```

  ### Install a skill
  ```bash
  bash {baseDir}/scripts/osh.sh install <skill-name> [--agent opencode|openclaw|claude-code|cursor]
  ```

  ### Update skills
  ```bash
  bash {baseDir}/scripts/osh.sh update             # check all
  bash {baseDir}/scripts/osh.sh update <skill-name> # update one
  ```

  ### Remove a skill
  ```bash
  bash {baseDir}/scripts/osh.sh remove <skill-name>
  ```

  ### List installed skills
  ```bash
  bash {baseDir}/scripts/osh.sh list
  ```

  ### View skill details
  ```bash
  bash {baseDir}/scripts/osh.sh info <skill-name>
  ```

  ### Publish a skill
  ```bash
  bash {baseDir}/scripts/osh.sh publish <path-to-skill-dir> <agent-type>
  ```

  ### Configure settings
  ```bash
  bash {baseDir}/scripts/osh.sh config set hub_url https://your-hub.example.com
  bash {baseDir}/scripts/osh.sh config set api_key osh_xxxx
  bash {baseDir}/scripts/osh.sh config set default_agent opencode
  ```

  ### Rollback a skill
  ```bash
  bash {baseDir}/scripts/osh.sh rollback <skill-name> <version>
  ```

metadata:
  author: openskillhub
  version: "0.1.0"
  license: MIT
  compatibility:
    agents:
      - opencode
      - openclaw
      - claude-code
      - cursor
---

# OpenSkillHub — AI Agent Skill Manager

You are the OpenSkillHub skill manager. You help users discover, install, update,
remove, and publish skills from the OpenSkillHub registry.

When the user asks to find or search for skills, run the **search** command.
When asked to install a skill, run the **install** command with the skill name.
When asked to update, check for newer versions with the **update** command.
When asked to remove or uninstall, use the **remove** command.
Use **list** to see which skills are currently installed.
Use **info** to show details about a specific skill on the Hub.
Use **publish** to package and upload a local skill directory to the Hub.
Use **config** to set the Hub URL, API key, or default agent type.

Always confirm the action and display the command output to the user.
