import { apiFetch } from '@/lib/api';
import type { PaginatedResponse, Skill, Tag } from '@openskillhub/shared';
import { AGENT_LABELS, type AgentType } from '@openskillhub/shared';
import type { CategoryWithCount } from '@/lib/types';
import Link from 'next/link';
import { Suspense } from 'react';
import SkillFilters from './SkillFilters';

function highlightText(text: string, query?: string) {
  if (!query || !text) return text;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return text;
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part)
      ? <mark key={i} style={{ background: '#fff3b0', padding: '0 1px', borderRadius: '2px' }}>{part}</mark>
      : part
  );
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
      <div style={{
        background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.06))',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '1.5rem',
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>技能库</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>搜索、筛选、发现适合你的 AI Agent 技能</p>
      </div>

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
          color: 'var(--text-muted)',
        }}
      >
        <span>共 <strong style={{ color: 'var(--text)' }}>{result.total}</strong> 个技能</span>
        {result.totalPages > 1 && (
          <span>
            第 {result.page} / {result.totalPages} 页
          </span>
        )}
      </div>

      {/* 技能列表 */}
      {result.data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem' }}>未找到匹配的技能</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            尝试调整搜索关键词或筛选条件
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.data.map((skill: Skill & { category?: { name: string; slug: string }; tags?: { name: string; slug: string }[]; author?: { username: string }; versions?: { packages: { agentType: string }[] }[] }) => {
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{highlightText(skill.displayName, params.q)}</h3>
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
                  {(() => {
                    const desc = skill.description?.slice(0, 140) ?? '';
                    const ellipsis = (skill.description?.length ?? 0) > 140 ? '...' : '';
                    return <>{highlightText(desc, params.q)}{ellipsis}</>;
                  })()}
                </p>
                {/* 元信息行 */}
                <div
                  style={{
                    marginTop: '0.75rem',
                    display: 'flex',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {skill.author && <span style={{ fontWeight: 500 }}>@{skill.author.username}</span>}
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
                  {skill.tags &&
                    skill.tags.slice(0, 3).map((tag) => (
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
                  {agents.length > 0 && (
                    <span style={{ display: 'inline-flex', gap: '0.3rem' }}>
                      {agents.map((a) => (
                        <span
                          key={a}
                          style={{
                            background: 'var(--success-bg)',
                            color: 'var(--success)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                          }}
                        >
                          {AGENT_LABELS[a as AgentType] || a}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </Link>
              );
            })}
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
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text)',
                    textDecoration: 'none',
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
                        <span style={{ padding: '0.4rem 0.25rem', color: 'var(--text-muted)' }}>…</span>
                      )}
                      <Link
                        href={`/skills?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                        style={{
                          padding: '0.4rem 0.75rem',
                          border: p === result.page ? 'none' : '1px solid var(--border)',
                          borderRadius: '8px',
                          fontWeight: p === result.page ? 'bold' : 'normal',
                          background: p === result.page ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                          color: p === result.page ? 'white' : 'var(--text)',
                          fontSize: '0.85rem',
                          textDecoration: 'none',
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
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text)',
                    textDecoration: 'none',
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
