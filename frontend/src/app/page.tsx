import { apiFetch } from '@/lib/api';
import type { PaginatedResponse, Skill } from '@openskillhub/shared';
import { AGENT_LABELS, type AgentType } from '@openskillhub/shared';
import type { CategoryWithCount } from '@/lib/types';
import { CATEGORY_ICONS } from '@/lib/constants';
import Link from 'next/link';
import HeroSearch from './HeroSearch';

export default async function HomePage() {
  const [skills, categories, stats] = await Promise.all([
    apiFetch<PaginatedResponse<Skill>>('/skills?sort=downloads&limit=8', { next: { revalidate: 60 } } as RequestInit)
      .then((res) => res.data)
      .catch(() => [] as Skill[]),
    apiFetch<CategoryWithCount[]>('/categories', { next: { revalidate: 300 } } as RequestInit).catch(() => [] as CategoryWithCount[]),
    apiFetch<{ skills: number; authors: number; downloads: number }>('/stats/overview', { next: { revalidate: 60 } } as RequestInit)
      .catch(() => ({ skills: 0, authors: 0, downloads: 0 })),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <h1>OpenSkillHub</h1>
        <p className="hero-subtitle">
          AI Agent 技能注册中心 — 搜索、分享、管理 AI Agent 技能
        </p>
        <p className="hero-agents">
          支持 OpenCode · OpenClaw · Claude Code · Cursor · Goose · Amp
        </p>
        <HeroSearch />
        {(stats.skills > 0 || stats.downloads > 0) && (
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">{stats.skills}</span>
              <span className="hero-stat-label">技能</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">{stats.downloads}</span>
              <span className="hero-stat-label">下载</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">{stats.authors}</span>
              <span className="hero-stat-label">开发者</span>
            </div>
          </div>
        )}
        <div className="hero-actions">
          <Link href="/skills" className="hero-btn-secondary">
            浏览技能
          </Link>
          <Link href="/categories" className="hero-btn-primary">
            按分类浏览
          </Link>
        </div>
      </section>

      {/* 分类导航 */}
      {categories.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>分类</h2>
            <Link href="/categories" style={{ fontSize: '0.85rem' }}>
              查看全部 →
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/skills?category=${cat.slug}`}
                className="category-card"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>{CATEGORY_ICONS[cat.slug] || '📦'}</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{cat.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat._count.skills} 个技能</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 热门技能 */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>热门技能</h2>
          <Link href="/skills?sort=downloads" style={{ fontSize: '0.85rem' }}>
            查看更多 →
          </Link>
        </div>
        {skills.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>暂无技能发布，启动后端并发布你的第一个技能！</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {(skills as (Skill & { author?: { username: string; displayName?: string }; versions?: { packages: { agentType: string }[] }[] })[]).map((skill) => {
              const agents = [...new Set(skill.versions?.flatMap((v) => v.packages.map((p) => p.agentType)) ?? [])];
              return (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{skill.displayName}</h3>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600,
                    color: 'var(--accent)', background: 'var(--accent-bg)',
                    padding: '0.15rem 0.5rem', borderRadius: '10px', whiteSpace: 'nowrap',
                  }}>
                    ↓ {skill.downloadCount}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                  {skill.description?.slice(0, 100)}{(skill.description?.length ?? 0) > 100 ? '...' : ''}
                </p>
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {skill.author && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      @{skill.author.username}
                    </span>
                  )}
                  {agents.map((a) => (
                    <span key={a} style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.125rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 500 }}>
                      {AGENT_LABELS[a as AgentType] || a}
                    </span>
                  ))}
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
