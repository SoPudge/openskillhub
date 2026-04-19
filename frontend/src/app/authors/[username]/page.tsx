import { apiFetch } from '@/lib/api';
import type { PaginatedResponse } from '@openskillhub/shared';
import type { SkillWithMeta } from '@/lib/types';
import Link from 'next/link';

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
      <div style={{
        background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.06))',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            width: '3.5rem', height: '3.5rem', borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', color: 'white', fontWeight: 700,
          }}>
            {(displayName || username).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>@{username}</h1>
            {displayName !== username && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: '0.15rem 0 0' }}>{displayName}</p>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            maxWidth: '500px',
          }}
        >
          {[
            { value: skills.length, label: '技能' },
            { value: totalDownloads.toLocaleString(), label: '总下载量' },
            { value: allAgents.length, label: 'Agent' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                textAlign: 'center',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 涉及分类 */}
        {allCategories.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {allCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/skills?category=${cat.slug}&author=${username}`}
                style={{
                  padding: '0.25rem 0.7rem',
                  background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.08))',
                  border: '1px solid rgba(102,126,234,0.15)',
                  borderRadius: '14px',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  color: 'var(--accent)',
                  fontWeight: 500,
                }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 技能列表 */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: '4px', height: '1.25rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
        发布的技能
      </h2>

      {skills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p>该用户尚未发布技能</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {skills.map((skill) => (
            <Link
              key={skill.id}
              href={`/skills/${skill.name}`}
              className="skill-card"
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                background: 'var(--bg-secondary)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)', borderRadius: '12px 12px 0 0' }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{skill.displayName}</h3>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--accent)', background: 'var(--accent-bg)',
                  padding: '0.15rem 0.5rem', borderRadius: '10px', whiteSpace: 'nowrap',
                }}>
                  ↓ {skill.downloadCount}
                </span>
              </div>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginTop: '0.4rem',
                  lineHeight: '1.5',
                }}
              >
                {skill.description?.slice(0, 140)}
                {(skill.description?.length ?? 0) > 140 ? '...' : ''}
              </p>
              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  flexWrap: 'wrap',
                }}
              >
                {skill.category && (
                  <span
                    style={{
                      background: 'var(--accent-bg)',
                      color: 'var(--accent)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    {skill.category.name}
                  </span>
                )}
                {skill.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag.slug}
                    style={{
                      background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.06))',
                      border: '1px solid rgba(102,126,234,0.12)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
                {skill.versions && skill.versions[0] && (
                  <span style={{ fontSize: '0.75rem' }}>v{skill.versions[0].version}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
