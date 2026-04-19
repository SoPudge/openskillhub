import { apiFetch } from '@/lib/api';
import type { PaginatedResponse, Skill } from '@openskillhub/shared';
import { AGENT_LABELS, type AgentType } from '@openskillhub/shared';
import type { CategoryWithCount } from '@/lib/types';
import { CATEGORY_ICONS } from '@/lib/constants';
import Link from 'next/link';

export default async function HomePage() {
  const [skills, categories] = await Promise.all([
    apiFetch<PaginatedResponse<Skill>>('/skills?sort=downloads&limit=8', { next: { revalidate: 60 } } as RequestInit)
      .then((res) => res.data)
      .catch(() => [] as Skill[]),
    apiFetch<CategoryWithCount[]>('/categories', { next: { revalidate: 300 } } as RequestInit).catch(() => [] as CategoryWithCount[]),
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
            {(skills as (Skill & { versions?: { packages: { agentType: string }[] }[] })[]).map((skill) => {
              const agents = [...new Set(skill.versions?.flatMap((v) => v.packages.map((p) => p.agentType)) ?? [])];
              return (
              <Link
                key={skill.id}
                href={`/skills/${skill.name}`}
                className="skill-card"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <h3>{skill.displayName}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {skill.description?.slice(0, 120)}
                </p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>↓ {skill.downloadCount}</span>
                  {agents.map((a) => (
                    <span key={a} style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.7rem' }}>
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
