import { apiFetch } from '@/lib/api';
import type { PaginatedResponse, Skill } from '@openskillhub/shared';
import Link from 'next/link';

interface SkillWithMeta extends Skill {
  author: { username: string; displayName?: string };
  category?: { name: string; slug: string };
  tags?: { name: string; slug: string }[];
  versions?: { version: string; packages: { agentType: string }[] }[];
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let result: PaginatedResponse<SkillWithMeta> = {
    data: [],
    total: 0,
    page: 1,
    limit: 100,
    totalPages: 0,
  };
  try {
    result = await apiFetch<PaginatedResponse<SkillWithMeta>>(
      `/skills?author=${encodeURIComponent(username)}&limit=100&sort=downloads`,
    );
  } catch {
    // API not available
  }

  const skills = result.data;
  const totalDownloads = skills.reduce((sum, s) => sum + s.downloadCount, 0);
  const allAgents = [
    ...new Set(
      skills.flatMap(
        (s) => s.versions?.flatMap((v) => v.packages.map((p) => p.agentType)) ?? [],
      ),
    ),
  ];
  const allCategories = [
    ...new Map(
      skills.filter((s) => s.category).map((s) => [s.category!.slug, s.category!]),
    ).values(),
  ];

  const displayName = skills[0]?.author?.displayName || username;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #eee',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
          @{username}
        </h1>
        {displayName !== username && (
          <p style={{ color: '#666', fontSize: '1.05rem' }}>{displayName}</p>
        )}

        {/* 统计卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.25rem',
            maxWidth: '500px',
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0070f3' }}>
              {skills.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#999' }}>技能</div>
          </div>
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0070f3' }}>
              {totalDownloads.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#999' }}>总下载量</div>
          </div>
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0070f3' }}>
              {allAgents.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#999' }}>Agent</div>
          </div>
        </div>

        {/* 涉及分类 */}
        {allCategories.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {allCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/skills?category=${cat.slug}&author=${username}`}
                style={{
                  padding: '0.2rem 0.6rem',
                  background: '#f0f0f0',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  color: '#555',
                }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 技能列表 */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
        发布的技能
      </h2>

      {skills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
          <p>该用户尚未发布技能</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <h3 style={{ fontSize: '1.05rem' }}>{skill.displayName}</h3>
                <span
                  style={{ fontSize: '0.8rem', color: '#999', whiteSpace: 'nowrap' }}
                >
                  ↓ {skill.downloadCount}
                </span>
              </div>
              <p
                style={{
                  color: '#666',
                  fontSize: '0.9rem',
                  marginTop: '0.25rem',
                  lineHeight: '1.5',
                }}
              >
                {skill.description?.slice(0, 160)}
                {(skill.description?.length ?? 0) > 160 ? '...' : ''}
              </p>
              <div
                style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#999',
                  flexWrap: 'wrap',
                }}
              >
                {skill.category && (
                  <span
                    style={{
                      background: '#f0f0f0',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '3px',
                    }}
                  >
                    {skill.category.name}
                  </span>
                )}
                {skill.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag.slug}
                    style={{
                      background: '#f8f8f8',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '3px',
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
                {skill.versions && skill.versions[0] && (
                  <span>v{skill.versions[0].version}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
