'use client';

import { useState, useCallback } from 'react';
import { API_BASE } from '@/lib/constants';

interface SearchResult {
  score: number;
  slug: string;
  displayName: string;
  summary: string;
  version: string | null;
  updatedAt: number;
}

interface SkillDetail {
  skill: {
    slug: string;
    displayName: string;
    summary: string;
    tags: Record<string, string>;
    stats: {
      downloads: number;
      stars: number;
      versions: number;
    };
    createdAt: number;
    updatedAt: number;
  };
  latestVersion: {
    version: string;
    changelog: string;
    files: { path: string; size: number }[];
  } | null;
}

export default function ClawHubPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setDetail(null);
    try {
      const res = await fetch(`${API_BASE}/clawhub/search?q=${encodeURIComponent(query.trim())}&limit=20`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const openDetail = useCallback(async (slug: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/clawhub/skills/${slug}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>
          <span style={{ color: '#8b5cf6' }}>ClawHub</span> 技能市场
        </h1>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          搜索来自 <a href="https://clawhub.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6' }}>clawhub.ai</a> 的
          OpenClaw 社区技能 — 52,000+ 技能可供浏览
        </p>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="搜索 ClawHub 技能..."
          style={{
            flex: 1,
            padding: '0.6rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />
        <button
          onClick={doSearch}
          disabled={loading || !query.trim()}
          style={{
            padding: '0.6rem 1.5rem',
            background: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            opacity: loading || !query.trim() ? 0.6 : 1,
          }}
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {/* Detail panel */}
      {detail && (
        <div
          style={{
            border: '1px solid #8b5cf6',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            background: '#faf5ff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#8b5cf6' }}>
              {detail.skill.displayName}
            </h2>
            <button
              onClick={() => setDetail(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#999' }}
            >
              ✕
            </button>
          </div>
          <p style={{ color: '#555', margin: '0.5rem 0', lineHeight: '1.5' }}>{detail.skill.summary}</p>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#666', flexWrap: 'wrap' }}>
            <span>↓ {detail.skill.stats.downloads.toLocaleString()} 下载</span>
            <span>★ {detail.skill.stats.stars} 星</span>
            <span>{detail.skill.stats.versions} 个版本</span>
            {detail.latestVersion && <span>最新: v{detail.latestVersion.version}</span>}
          </div>
          {detail.latestVersion?.changelog && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <strong>更新日志:</strong>
              <p style={{ color: '#555', marginTop: '0.25rem', whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'auto' }}>
                {detail.latestVersion.changelog.slice(0, 500)}
              </p>
            </div>
          )}
          {detail.latestVersion?.files && detail.latestVersion.files.length > 0 && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <strong>文件:</strong>
              <div style={{ marginTop: '0.25rem', color: '#555' }}>
                {detail.latestVersion.files.map((f) => (
                  <span key={f.path} style={{ marginRight: '1rem' }}>
                    {f.path} ({(f.size / 1024).toFixed(1)}KB)
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: '0.75rem' }}>
            <a
              href={`https://clawhub.ai/skills/${detail.skill.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '0.4rem 1rem',
                background: '#8b5cf6',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.85rem',
              }}
            >
              在 ClawHub 上查看 →
            </a>
          </div>
        </div>
      )}

      {detailLoading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#8b5cf6' }}>
          加载详情中...
        </div>
      )}

      {/* Results */}
      {searched && !loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
          <p style={{ fontSize: '1.1rem' }}>未找到匹配的 ClawHub 技能</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            尝试其他关键词，如 &quot;github&quot;、&quot;docker&quot;、&quot;kubernetes&quot;
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.map((item) => (
            <div
              key={item.slug}
              onClick={() => openDetail(item.slug)}
              style={{
                border: '1px solid #e8e0f0',
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.background = '#faf5ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e8e0f0';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: '1.05rem' }}>{item.displayName}</h3>
                <span style={{ fontSize: '0.75rem', color: '#8b5cf6', background: '#f3e8ff', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
                  ClawHub
                </span>
              </div>
              <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem', lineHeight: '1.5' }}>
                {item.summary?.slice(0, 160)}{(item.summary?.length ?? 0) > 160 ? '...' : ''}
              </p>
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#999', display: 'flex', gap: '0.75rem' }}>
                <span>{item.slug}</span>
                {item.version && <span>v{item.version}</span>}
                {item.updatedAt && (
                  <span>更新于 {new Date(item.updatedAt).toLocaleDateString('zh-CN')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
          <p style={{ fontSize: '1.1rem' }}>输入关键词搜索 ClawHub 社区技能</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            热门搜索: github · docker · kubernetes · aws · git · python
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['github', 'docker', 'kubernetes', 'aws', 'python', 'git'].map((tag) => (
              <button
                key={tag}
                onClick={() => { setQuery(tag); }}
                style={{
                  padding: '0.4rem 1rem',
                  border: '1px solid #e8e0f0',
                  borderRadius: '20px',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#8b5cf6',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
