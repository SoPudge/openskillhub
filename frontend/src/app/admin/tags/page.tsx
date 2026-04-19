'use client';

import { useAuth } from '@/lib/auth';
import { authApiFetch } from '@/lib/api';
import { useCallback, useEffect, useState, useMemo } from 'react';

interface AdminTag {
  id: string;
  name: string;
  slug: string;
  _count: { skills: number };
}

export default function AdminTagsPage() {
  const { token } = useAuth();
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [mergeSource, setMergeSource] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState('');
  const [showMerge, setShowMerge] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const api = useMemo(() => token ? authApiFetch(token) : null, [token]);

  const fetchTags = useCallback(async () => {
    if (!api) return;
    try {
      setTags(await api<AdminTag[]>('/admin/tags'));
    } catch { /* ignore */ }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    if (token) fetchTags();
  }, [token, fetchTags]);

  const renameTag = async (slug: string) => {
    if (!editName.trim() || !api) return;
    setActionLoading(true);
    try {
      await api(`/admin/tags/${slug}`, { method: 'PATCH', body: JSON.stringify({ name: editName }) });
      setEditSlug(null);
      await fetchTags();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const deleteTag = async (slug: string, name: string) => {
    if (!api) return;
    if (!confirm(`确认删除标签 "${name}"？将从所有技能中移除。`)) return;
    setActionLoading(true);
    try {
      await api(`/admin/tags/${slug}`, { method: 'DELETE' });
      await fetchTags();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const toggleMergeSource = (slug: string) => {
    setMergeSource((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const executeMerge = async () => {
    if (mergeSource.length === 0 || !mergeTarget.trim() || !api) return;
    setActionLoading(true);
    try {
      await api('/admin/tags/merge', {
        method: 'POST',
        body: JSON.stringify({ source: mergeSource, target: mergeTarget }),
      });
      setMergeSource([]);
      setMergeTarget('');
      setShowMerge(false);
      await fetchTags();
    } catch (err) {
      alert(err instanceof Error ? err.message : '合并失败');
    }
    setActionLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>标签管理</h1>
        <button
          onClick={() => setShowMerge(!showMerge)}
          style={{ padding: '0.5rem 1rem', background: showMerge ? '#dc2626' : '#111', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          {showMerge ? '取消合并' : '🔀 合并标签'}
        </button>
      </div>

      {/* Merge panel */}
      {showMerge && (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: '#fafafa' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>合并标签</h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
            点击下方标签选择要合并的源标签，输入目标标签名称。源标签将被删除，关联的技能将转移到目标标签。
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem' }}>已选 {mergeSource.length} 个</span>
            <span style={{ fontSize: '0.85rem', color: '#999' }}>→</span>
            <input
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              placeholder="目标标签名称"
              style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            <button
              onClick={executeMerge}
              disabled={actionLoading || mergeSource.length === 0 || !mergeTarget.trim()}
              style={{ padding: '0.4rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', opacity: mergeSource.length === 0 ? 0.5 : 1 }}
            >
              执行合并
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.75rem' }}>
        共 {tags.length} 个标签
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>加载中...</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {tags.map((tag) => (
            <div
              key={tag.id}
              style={{
                border: mergeSource.includes(tag.slug) ? '2px solid #dc2626' : '1px solid #eee',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: mergeSource.includes(tag.slug) ? '#fef2f2' : '#fff',
                cursor: showMerge ? 'pointer' : 'default',
              }}
              onClick={showMerge ? () => toggleMergeSource(tag.slug) : undefined}
            >
              {editSlug === tag.slug ? (
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && renameTag(tag.slug)}
                    style={{ padding: '0.2rem 0.4rem', border: '1px solid #ddd', borderRadius: '3px', fontSize: '0.85rem', width: '100px' }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); renameTag(tag.slug); }}
                    style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditSlug(null); }}
                    style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', border: '1px solid #ddd', borderRadius: '3px', cursor: 'pointer', background: '#fff' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{tag.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>({tag._count.skills})</span>
                  {!showMerge && (
                    <div style={{ display: 'flex', gap: '0.15rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditSlug(tag.slug); setEditName(tag.name); }}
                        style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem', border: '1px solid #ddd', borderRadius: '3px', cursor: 'pointer', background: '#fff' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTag(tag.slug, tag.name); }}
                        style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem', border: '1px solid #fca5a5', borderRadius: '3px', cursor: 'pointer', background: '#fff', color: '#dc2626' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {tags.length === 0 && (
            <div style={{ color: '#999', padding: '2rem', textAlign: 'center', width: '100%' }}>暂无标签</div>
          )}
        </div>
      )}
    </div>
  );
}
