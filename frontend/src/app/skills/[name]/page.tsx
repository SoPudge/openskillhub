import { apiFetch } from '@/lib/api';
import { notFound } from 'next/navigation';

interface SkillDetail {
  id: string;
  name: string;
  displayName: string;
  description: string;
  author: { username: string; displayName?: string };
  category?: { name: string; slug: string };
  visibility: string;
  homepageUrl?: string;
  license?: string;
  downloadCount: number;
  tags?: { name: string; slug: string }[];
  versions: {
    id: string;
    version: string;
    changelog?: string;
    createdAt: string;
    packages: { agentType: string; fileSize: number }[];
  }[];
  createdAt: string;
  updatedAt: string;
}

export default async function SkillDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  let skill: SkillDetail;
  try {
    skill = await apiFetch<SkillDetail>(`/skills/${name}`);
  } catch {
    notFound();
  }

  const latestVersion = skill.versions[0];
  const supportedAgents = latestVersion
    ? [...new Set(latestVersion.packages.map((p) => p.agentType))]
    : [];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>{skill.displayName}</h1>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          by @{skill.author.username}
          {skill.license && <> · {skill.license}</>}
          {latestVersion && <> · v{latestVersion.version}</>}
        </p>
        <p style={{ marginTop: '0.5rem' }}>{skill.description}</p>
      </div>

      {/* Supported agents */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {['opencode', 'openclaw', 'claude-code', 'cursor'].map((agent) => (
          <span
            key={agent}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              background: supportedAgents.includes(agent) ? '#e6f4ea' : '#f5f5f5',
              color: supportedAgents.includes(agent) ? '#137333' : '#999',
            }}
          >
            {agent} {supportedAgents.includes(agent) ? '✓' : '✗'}
          </span>
        ))}
      </div>

      {/* Install command */}
      {latestVersion && supportedAgents[0] && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Install</h2>
          <code
            style={{
              display: 'block',
              padding: '1rem',
              background: '#f5f5f5',
              borderRadius: '6px',
              fontSize: '0.9rem',
            }}
          >
            bash ~/path/to/openskillhub/scripts/osh.sh install {skill.name}
          </code>
        </div>
      )}

      {/* Tags */}
      {skill.tags && skill.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {skill.tags.map((tag) => (
            <span
              key={tag.slug}
              style={{
                padding: '0.2rem 0.6rem',
                background: '#f0f0f0',
                borderRadius: '12px',
                fontSize: '0.8rem',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Versions */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Versions</h2>
      {skill.versions.length === 0 ? (
        <p style={{ color: '#999' }}>No versions published yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {skill.versions.map((v) => (
            <div
              key={v.id}
              style={{ padding: '0.75rem', border: '1px solid #eee', borderRadius: '6px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>v{v.version}</strong>
                <span style={{ fontSize: '0.8rem', color: '#999' }}>
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </div>
              {v.changelog && (
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                  {v.changelog}
                </p>
              )}
              <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#999' }}>
                Packages: {v.packages.map((p) => p.agentType).join(', ') || 'none'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#999' }}>
        {skill.downloadCount} total downloads ·{' '}
        {skill.homepageUrl && (
          <>
            <a href={skill.homepageUrl} target="_blank" rel="noopener noreferrer">
              Homepage
            </a>{' '}
            ·{' '}
          </>
        )}
        Created {new Date(skill.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
