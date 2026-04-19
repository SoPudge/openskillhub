'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tag } from '@openskillhub/shared';
import { AGENT_LABELS } from '@openskillhub/shared';
import type { CategoryWithCount } from '@/lib/types';

const AGENT_OPTIONS = Object.entries(AGENT_LABELS).map(([value, label]) => ({ value, label }));

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
  categories: CategoryWithCount[];
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

  // Autocomplete state
  const [inputValue, setInputValue] = useState(currentQ);
  const [suggestions, setSuggestions] = useState<{ name: string; displayName: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) { setSuggestions([]); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/skills/suggest?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch { setSuggestions([]); }
  }, []);

  const onInputChange = useCallback((val: string) => {
    setInputValue(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(val), 200);
  }, [fetchSuggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = useCallback((name: string) => {
    setShowSuggestions(false);
    router.push(`/skills/${name}`);
  }, [router]);

  const submitSearch = useCallback((q: string) => {
    setShowSuggestions(false);
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set('q', q); else params.delete('q');
    params.delete('page');
    router.push(`/skills?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* 搜索栏 */}
      {/* 搜索栏 + 自动补全 */}
      <div ref={suggestRef} style={{ position: 'relative', display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {/* 保留现有筛选参数 */}
        <input
          type="text"
          placeholder="搜索技能..."
          value={inputValue}
          onChange={(e) => { onInputChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitSearch(inputValue); } }}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
          }}
        />
        <button
          type="button"
          onClick={() => submitSearch(inputValue)}
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
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'white', border: '1px solid #ddd', borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10,
            marginTop: '4px', overflow: 'hidden',
          }}>
            {suggestions.map((s) => (
              <button
                key={s.name}
                onClick={() => selectSuggestion(s.name)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '0.5rem 1rem', border: 'none', background: 'none',
                  cursor: 'pointer', fontSize: '0.9rem',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#f5f5f5'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
              >
                <span style={{ fontWeight: 500 }}>{s.displayName}</span>
                <span style={{ color: '#999', marginLeft: '0.5rem', fontSize: '0.8rem' }}>{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
