import { apiFetch } from '@/lib/api';
import type { PaginatedResponse, Skill } from '@openskillhub/shared';
import Link from 'next/link';

export default async function HomePage() {
  let skills: Skill[] = [];
  try {
    const res = await apiFetch<PaginatedResponse<Skill>>('/skills?sort=downloads&limit=10');
    skills = res.data;
  } catch {
    // API not available yet — render empty
  }

  return (
    <div>
      <section style={{ textAlign: 'center', padding: '3rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>OpenSkillHub</h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>
          AI Agent Skills Registry — Search, share, and manage skills for your AI agents
        </p>
        <p style={{ marginTop: '1rem', color: '#999' }}>
          Supports OpenCode · OpenClaw · Claude Code · Cursor · and more
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>Popular Skills</h2>
        {skills.length === 0 ? (
          <p style={{ color: '#999' }}>No skills yet. Start the backend and publish your first skill!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {skills.map((skill) => (
              <Link
                key={skill.id}
                href={`/skills/${skill.name}`}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <h3>{skill.displayName}</h3>
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {skill.description?.slice(0, 120)}
                </p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#999' }}>
                  {skill.downloadCount} downloads
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
