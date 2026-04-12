# OpenSkillHub API Reference

Base URL: `http://localhost:3001/api/v1` (configurable)

## Authentication

All write endpoints require authentication via API Key header:

```
X-API-Key: osh_xxxxxxxxxxxxxxxx
```

Or JWT Bearer token:

```
Authorization: Bearer <jwt-token>
```

## Endpoints

### Skills

| Method | Path | Description |
|--------|------|-------------|
| GET | `/skills` | List/search skills |
| GET | `/skills/:name` | Get skill details |
| POST | `/skills` | Create skill (auth) |
| PATCH | `/skills/:name` | Update skill (auth) |
| DELETE | `/skills/:name` | Delete skill (auth) |
| POST | `/skills/check-updates` | Batch check for updates |

#### GET /skills Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text search query |
| `category` | string | Filter by category slug |
| `tag` | string | Filter by tag slug |
| `agent` | string | Filter by agent type |
| `visibility` | string | `public` / `private` / `team` |
| `sort` | string | `downloads` / `newest` / `updated` / `name` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20) |

### Versions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/skills/:name/versions` | List versions |
| POST | `/skills/:name/versions` | Create version (auth) |
| GET | `/skills/:name/versions/:version` | Get version detail |

### Packages

| Method | Path | Description |
|--------|------|-------------|
| POST | `/skills/:name/versions/:version/packages` | Upload package (auth, multipart) |
| GET | `/skills/:name/versions/:version/packages/:agent` | Download package |
| GET | `/skills/:name/latest/:agent` | Download latest version |

### Categories & Tags

| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | Category tree |
| GET | `/tags` | All tags |
| GET | `/tags/popular` | Popular tags |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login (returns JWT) |
| GET | `/auth/me` | Current user info |
| POST | `/auth/api-keys` | Create API key |
| GET | `/auth/api-keys` | List API keys |
| DELETE | `/auth/api-keys/:id` | Revoke API key |
