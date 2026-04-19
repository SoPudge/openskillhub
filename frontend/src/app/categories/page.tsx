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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>技能分类</h1>
        <p style={{ color: '#666' }}>
          按分类浏览 {totalSkills} 个技能，找到适合你工作流的 AI Agent 技能
        </p>
      </div>

      {categories.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '3rem' }}>
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
              style={{
                border: '1px solid #eee',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {CATEGORY_ICONS[cat.slug] || '📦'}
                </span>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{cat.name}</h2>
              </div>
              {cat.description && (
                <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                  {cat.description}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  color: '#999',
                }}
              >
                <span>{cat._count.skills} 个技能</span>
                <span style={{ color: '#0070f3' }}>浏览 →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 快捷链接 */}
      <div
        style={{
          marginTop: '2.5rem',
          padding: '1.25rem',
          background: '#f8f9fa',
          borderRadius: '10px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#666', marginBottom: '0.75rem' }}>
          没有找到合适的分类？
        </p>
        <Link
          href="/skills"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1.5rem',
            background: '#0070f3',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          浏览全部技能
        </Link>
      </div>
    </div>
  );
}
