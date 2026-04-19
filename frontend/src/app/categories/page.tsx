import { apiFetch } from '@/lib/api';
import type { CategoryWithCount } from '@/lib/types';
import { CATEGORY_ICONS } from '@/lib/constants';
import Link from 'next/link';

export default async function CategoriesPage() {
  let categories: CategoryWithCount[] = [];
  try {
    categories = await apiFetch<CategoryWithCount[]>('/categories', { next: { revalidate: 300 } } as RequestInit);
  } catch {
    // API not available
  }

  const totalSkills = categories.reduce((sum, c) => sum + c._count.skills, 0);

  return (
    <div>
      {/* Page Header */}
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
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>技能分类</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
          按分类浏览 <strong style={{ color: 'var(--accent)' }}>{totalSkills}</strong> 个技能，找到适合你工作流的 AI Agent 技能
        </p>
      </div>

      {categories.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
          暂无分类数据
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/skills?category=${cat.slug}`}
              className="category-card"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.6rem' }}>
                <span style={{
                  fontSize: '1.5rem',
                  width: '2.75rem', height: '2.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.12))',
                  flexShrink: 0,
                }}>
                  {CATEGORY_ICONS[cat.slug] || '📦'}
                </span>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{cat.name}</h2>
              </div>
              {cat.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                  {cat.description}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  paddingTop: '0.6rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{
                  background: 'var(--accent-bg)', color: 'var(--accent)',
                  padding: '0.15rem 0.55rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.75rem',
                }}>{cat._count.skills} 个技能</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>浏览 →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 快捷链接 */}
      <div
        style={{
          marginTop: '2.5rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(102,126,234,0.06), rgba(118,75,162,0.04))',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          没有找到合适的分类？
        </p>
        <Link
          href="/skills"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
        >
          浏览全部技能
        </Link>
      </div>
    </div>
  );
}
