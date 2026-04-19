# @openskillhub/sdk

TypeScript SDK for the OpenSkillHub API.

## Installation

```bash
npm install @openskillhub/sdk
```

## Usage

```typescript
import { OpenSkillHubClient } from '@openskillhub/sdk';

const client = new OpenSkillHubClient({
  baseUrl: 'http://localhost:3001/api/v1',
});

// Login
const { token } = await client.login('user@example.com', 'password');
client.setToken(token);

// List skills
const skills = await client.listSkills({ page: 1, limit: 20 });

// Get skill details
const skill = await client.getSkill('my-skill');

// Search ClawHub
const results = await client.searchClawHub('github actions');

// Upload a package
const file = new Blob([zipBuffer], { type: 'application/zip' });
await client.uploadPackage('my-skill', '1.0.0', 'copilot', file, 'package.zip');
```

## API

### Authentication

- `register(email, username, password, displayName?)` – Register a new user
- `login(email, password)` – Login and receive a JWT token
- `setToken(token)` – Set JWT for subsequent requests
- `setApiKey(key)` – Set API key for subsequent requests
- `clearAuth()` – Clear authentication
- `me()` – Get current user profile

### Skills

- `listSkills(params?)` – List/search skills with pagination
- `getSkill(name)` – Get skill details
- `createSkill(data)` – Create a new skill
- `updateSkill(name, data)` – Update a skill
- `deleteSkill(name)` – Delete a skill
- `checkUpdates(installed)` – Check for updates to installed skills

### Versions & Packages

- `listVersions(skillName, params?)` – List versions of a skill
- `createVersion(skillName, data)` – Create a new version
- `uploadPackage(skillName, version, agentType, file, filename)` – Upload a package
- `downloadPackage(skillName, version, agentType)` – Download a specific package
- `downloadLatestPackage(skillName, agentType)` – Download latest version

### Categories, Tags, Teams

- `listCategories()` / `listTags()` / `listTeams()`
- `createTeam(name, slug)` / `getTeam(slug)`
- `addTeamMember(slug, username, role?)` / `removeTeamMember(slug, username)`

### ClawHub

- `searchClawHub(query, limit?)` – Search ClawHub registry
- `getClawHubSkill(slug)` – Get ClawHub skill details

## Error Handling

```typescript
import { OpenSkillHubError } from '@openskillhub/sdk';

try {
  await client.getSkill('nonexistent');
} catch (err) {
  if (err instanceof OpenSkillHubError) {
    console.log(err.statusCode); // 404
    console.log(err.code);       // 'NOT_FOUND'
    console.log(err.message);    // 'Skill not found'
  }
}
```
