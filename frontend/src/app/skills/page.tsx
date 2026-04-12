import { apiFetch } from '@/lib/api';
import type { PaginatedResponse, Skill } from '@openskillhub/shared';
import Link from 'next/link';

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; agent?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.category) query.set('category', params.category);
  if (params.agent) query.set('agent', params.agent);
  if (params.page) query.set('page', params.page);

  let result: PaginatedResponse<Skill> = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  try {
    result = await apiFetch<PaginatedResponse<Skill>>(`/skills?${query.toString()}`);
  } catch {
    // API not available
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Skills</h1>

      <form method="GET" action="/skills" style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          name="q"
          placeholder="Search skills..."
          defaultValue={params.q}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1.5rem',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>

      {result.data.length === 0 ? (
        <p style={{ color: '#999' }}>No skills found.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.data.map((skill) => (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3>{skill.displayName}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#999' }}>{skill.downloadCount} downloads</span>
                </div>
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {skill.description?.slice(0, 200)}
                </p>
              </Link>
            ))}
          </div>

          {result.totalPages > 1 && (
            <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/skills?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontWeight: p === result.page ? 'bold' : 'normal',
                  }}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
