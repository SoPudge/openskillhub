import { apiFetch } from '@/lib/api';
import type { Category, PaginatedResponse, Skill, Tag } from '@openskillhub/shared';
import Link from 'next/link';
import { Suspense } from 'react';
import SkillFilters from './SkillFilters';

interface CategoryWithCount extends Category {
  _count: { skills: number };
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    agent?: string;
    tag?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.category) query.set('category', params.category);
  if (params.agent) query.set('agent', params.agent);
  if (params.tag) query.set('tag', params.tag);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', params.page);

  // 并行获取: 技能列表 + 分类 + 标签
  const [result, categories, tags] = await Promise.all([
    apiFetch<PaginatedResponse<Skill>>(`/skills?${query.toString()}`).catch(
      () => ({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }) as PaginatedResponse<Skill>,
    ),
    apiFetch<CategoryWithCount[]>('/categories').catch(() => [] as CategoryWithCount[]),
    apiFetch<Tag[]>('/tags').catch(() => [] as Tag[]),
  ]);

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>技能库</h1>

      {/* 筛选区域 (客户端交互组件) */}
      <Suspense fallback={null}>
        <SkillFilters categories={categories} tags={tags} />
      </Suspense>

      {/* 结果统计 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: '#999',
        }}
      >
        <span>共 {result.total} 个技能</span>
        {result.totalPages > 1 && (
          <span>
            第 {result.page} / {result.totalPages} 页
          </span>
        )}
      </div>

      {/* 技能列表 */}
      {result.data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
          <p style={{ fontSize: '1.1rem' }}>未找到匹配的技能</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            尝试调整搜索关键词或筛选条件
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.data.map((skill: Skill & { category?: { name: string; slug: string }; tags?: { name: string; slug: string }[]; author?: { username: string } }) => (
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
                  transition: 'border-color 0.15s',
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
                  <span style={{ fontSize: '0.8rem', color: '#999', whiteSpace: 'nowrap' }}>
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
                {/* 元信息行 */}
                <div
                  style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    gap: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#999',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {skill.author && <span>@{skill.author.username}</span>}
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
                  {skill.tags &&
                    skill.tags.slice(0, 3).map((tag) => (
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
                </div>
              </Link>
            ))}
          </div>

          {/* 分页 */}
          {result.totalPages > 1 && (
            <div
              style={{
                marginTop: '2rem',
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {result.page > 1 && (
                <Link
                  href={`/skills?${new URLSearchParams({ ...params, page: String(result.page - 1) }).toString()}`}
                  style={{
                    padding: '0.4rem 0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                  }}
                >
                  ← 上一页
                </Link>
              )}
              {Array.from({ length: result.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === result.totalPages ||
                    Math.abs(p - result.page) <= 2,
                )
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev !== undefined && p - prev > 1;
                  return (
                    <span key={p} style={{ display: 'contents' }}>
                      {showEllipsis && (
                        <span style={{ padding: '0.4rem 0.25rem', color: '#999' }}>…</span>
                      )}
                      <Link
                        href={`/skills?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                        style={{
                          padding: '0.4rem 0.75rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontWeight: p === result.page ? 'bold' : 'normal',
                          background: p === result.page ? '#0070f3' : 'white',
                          color: p === result.page ? 'white' : 'inherit',
                          fontSize: '0.85rem',
                        }}
                      >
                        {p}
                      </Link>
                    </span>
                  );
                })}
              {result.page < result.totalPages && (
                <Link
                  href={`/skills?${new URLSearchParams({ ...params, page: String(result.page + 1) }).toString()}`}
                  style={{
                    padding: '0.4rem 0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                  }}
                >
                  下一页 →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
