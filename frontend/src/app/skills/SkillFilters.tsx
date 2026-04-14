'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface Category {
  slug: string;
  name: string;
  description?: string;
  _count: { skills: number };
}

interface Tag {
  slug: string;
  name: string;
}

const AGENT_OPTIONS = [
  { value: 'opencode', label: 'OpenCode' },
  { value: 'openclaw', label: 'OpenClaw' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'goose', label: 'Goose' },
  { value: 'amp', label: 'Amp' },
];

const SORT_OPTIONS = [
  { value: '', label: '默认排序' },
  { value: 'downloads', label: '下载量' },
  { value: 'newest', label: '最新发布' },
  { value: 'updated', label: '最近更新' },
  { value: 'name', label: '名称 A-Z' },
];

export default function SkillFilters({
  categories,
  tags,
}: {
  categories: Category[];
  tags: Tag[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentAgent = searchParams.get('agent') || '';
  const currentTag = searchParams.get('tag') || '';
  const currentSort = searchParams.get('sort') || '';

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page'); // 切换筛选时回到第一页
      router.push(`/skills?${params.toString()}`);
    },
    [router, searchParams],
  );

  const toggleTag = useCallback(
    (tagSlug: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const existing = params.get('tag')?.split(',').filter(Boolean) || [];
      const idx = existing.indexOf(tagSlug);
      if (idx >= 0) {
        existing.splice(idx, 1);
      } else {
        existing.push(tagSlug);
      }
      if (existing.length > 0) {
        params.set('tag', existing.join(','));
      } else {
        params.delete('tag');
      }
      params.delete('page');
      router.push(`/skills?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    router.push('/skills');
  }, [router]);

  const activeTags = currentTag ? currentTag.split(',') : [];
  const hasFilters = !!(currentCategory || currentAgent || currentTag || currentSort);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* 搜索栏 */}
      <form
        method="GET"
        action="/skills"
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
      >
        {/* 保留现有筛选参数 */}
        {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
        {currentAgent && <input type="hidden" name="agent" value={currentAgent} />}
        {currentTag && <input type="hidden" name="tag" value={currentTag} />}
        {currentSort && <input type="hidden" name="sort" value={currentSort} />}
        <input
          type="text"
          name="q"
          placeholder="搜索技能..."
          defaultValue={currentQ}
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
            fontSize: '0.9rem',
          }}
        >
          搜索
        </button>
      </form>

      {/* 筛选行 */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 分类下拉 */}
        <select
          value={currentCategory}
          onChange={(e) => updateParam('category', e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '0.85rem',
            background: currentCategory ? '#e8f4fd' : 'white',
            cursor: 'pointer',
          }}
        >
          <option value="">所有分类</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} ({c._count.skills})
            </option>
          ))}
        </select>

        {/* Agent 下拉 */}
        <select
          value={currentAgent}
          onChange={(e) => updateParam('agent', e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '0.85rem',
            background: currentAgent ? '#e8f4fd' : 'white',
            cursor: 'pointer',
          }}
        >
          <option value="">所有 Agent</option>
          {AGENT_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        {/* 排序下拉 */}
        <select
          value={currentSort}
          onChange={(e) => updateParam('sort', e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '0.85rem',
            background: currentSort ? '#e8f4fd' : 'white',
            cursor: 'pointer',
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* 清除筛选 */}
        {hasFilters && (
          <button
            onClick={clearAll}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: '#666',
              cursor: 'pointer',
            }}
          >
            ✕ 清除筛选
          </button>
        )}
      </div>

      {/* 标签 */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          {tags.map((t) => {
            const active = activeTags.includes(t.slug);
            return (
              <button
                key={t.slug}
                onClick={() => toggleTag(t.slug)}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  border: active ? '1px solid #0070f3' : '1px solid #ddd',
                  background: active ? '#e8f4fd' : '#f8f8f8',
                  color: active ? '#0070f3' : '#555',
                  cursor: 'pointer',
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {/* 活跃筛选指示 */}
      {(currentQ || hasFilters) && (
        <div
          style={{
            marginTop: '0.75rem',
            fontSize: '0.85rem',
            color: '#666',
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span>当前筛选:</span>
          {currentQ && (
            <span style={{ background: '#f0f0f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              搜索 &quot;{currentQ}&quot;
            </span>
          )}
          {currentCategory && (
            <span style={{ background: '#e8f4fd', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              分类: {categories.find((c) => c.slug === currentCategory)?.name || currentCategory}
            </span>
          )}
          {currentAgent && (
            <span style={{ background: '#e8f4fd', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Agent: {AGENT_OPTIONS.find((a) => a.value === currentAgent)?.label || currentAgent}
            </span>
          )}
          {activeTags.map((t) => (
            <span
              key={t}
              style={{ background: '#e8f4fd', padding: '0.15rem 0.5rem', borderRadius: '4px' }}
            >
              #{tags.find((tag) => tag.slug === t)?.name || t}
            </span>
          ))}
          {currentSort && (
            <span style={{ background: '#f0f0f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              排序: {SORT_OPTIONS.find((s) => s.value === currentSort)?.label || currentSort}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
