import { apiFetch } from '@/lib/api';
import type { Category, PaginatedResponse, Skill } from '@openskillhub/shared';
import Link from 'next/link';

interface CategoryWithCount extends Category {
  _count: { skills: number };
}

const CATEGORY_ICONS: Record<string, string> = {
  'dev-workflow': '⚙️',
  'code-gen': '🔧',
  docs: '📄',
  devops: '🚀',
  'data-db': '🗄️',
  security: '🔒',
  communication: '💬',
  utilities: '🧰',
};

export default async function HomePage() {
  const [skills, categories] = await Promise.all([
    apiFetch<PaginatedResponse<Skill>>('/skills?sort=downloads&limit=8')
      .then((res) => res.data)
      .catch(() => [] as Skill[]),
    apiFetch<CategoryWithCount[]>('/categories').catch(() => [] as CategoryWithCount[]),
  ]);

  return (
    <div>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '3rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>OpenSkillHub</h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>
          AI Agent 技能注册中心 — 搜索、分享、管理 AI Agent 技能
        </p>
        <p style={{ marginTop: '0.75rem', color: '#999' }}>
          支持 OpenCode · OpenClaw · Claude Code · Cursor · Goose · Amp
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link
            href="/skills"
            style={{
              padding: '0.6rem 1.5rem',
              background: '#0070f3',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}
          >
            浏览技能
          </Link>
          <Link
            href="/categories"
            style={{
              padding: '0.6rem 1.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              textDecoration: 'none',
              color: '#333',
              fontSize: '0.95rem',
            }}
          >
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
                style={{
                  border: '1px solid #eee',
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
                  <div style={{ fontSize: '0.75rem', color: '#999' }}>{cat._count.skills} 个技能</div>
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
          <p style={{ color: '#999' }}>暂无技能发布，启动后端并发布你的第一个技能！</p>
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
                  ↓ {skill.downloadCount}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
