'use client';

import { useAuth } from '@/lib/auth';
import { apiFetch, authApiFetch } from '@/lib/api';
import { useCallback, useEffect, useState, useMemo } from 'react';

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count?: { skills: number };
}

export default function AdminCategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', sortOrder: 0 });
  const [newForm, setNewForm] = useState({ name: '', slug: '', description: '', sortOrder: 0 });
  const [showNew, setShowNew] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const api = useMemo(() => token ? authApiFetch(token) : null, [token]);

  const fetchCategories = useCallback(async () => {
    try {
      setCategories(await apiFetch<AdminCategory[]>('/categories'));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const createCategory = async () => {
    if (!newForm.name || !newForm.slug || !api) return;
    setActionLoading(true);
    try {
      await api('/admin/categories', { method: 'POST', body: JSON.stringify(newForm) });
      setShowNew(false);
      setNewForm({ name: '', slug: '', description: '', sortOrder: 0 });
      await fetchCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
    setActionLoading(false);
  };

  const startEdit = (cat: AdminCategory) => {
    setEditId(cat.id);
    setEditForm({ name: cat.name, description: cat.description || '', sortOrder: cat.sortOrder });
  };

  const saveEdit = async (slug: string) => {
    if (!api) return;
    setActionLoading(true);
    try {
      await api(`/admin/categories/${slug}`, { method: 'PATCH', body: JSON.stringify(editForm) });
      setEditId(null);
      await fetchCategories();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const deleteCategory = async (slug: string, name: string) => {
    if (!api) return;
    if (!confirm(`确认删除分类 "${name}"？关联的技能将被取消分类。`)) return;
    setActionLoading(true);
    try {
      await api(`/admin/categories/${slug}`, { method: 'DELETE' });
      await fetchCategories();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const inputStyle = { padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>分类管理</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          style={{ padding: '0.5rem 1rem', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          + 新建分类
        </button>
      </div>

      {/* New category form */}
      {showNew && (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: '#fafafa' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>新建分类</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>名称</label>
              <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} style={inputStyle} placeholder="Development Workflow" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Slug</label>
              <input value={newForm.slug} onChange={(e) => setNewForm({ ...newForm, slug: e.target.value })} style={inputStyle} placeholder="dev-workflow" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>描述</label>
              <input value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>排序</label>
              <input type="number" value={newForm.sortOrder} onChange={(e) => setNewForm({ ...newForm, sortOrder: Number(e.target.value) })} style={{ ...inputStyle, width: '60px' }} />
            </div>
            <button onClick={createCategory} disabled={actionLoading} style={{ padding: '0.4rem 1rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
              创建
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>加载中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{ border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}
            >
              {editId === cat.id ? (
                /* Edit mode */
                <div style={{ flex: 1, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
                  <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} style={{ ...inputStyle, flex: 1 }} placeholder="描述" />
                  <input type="number" value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: Number(e.target.value) })} style={{ ...inputStyle, width: '60px' }} />
                  <button onClick={() => saveEdit(cat.slug)} disabled={actionLoading} style={{ padding: '0.3rem 0.75rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>保存</button>
                  <button onClick={() => setEditId(null)} style={{ padding: '0.3rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', background: '#fff' }}>取消</button>
                </div>
              ) : (
                /* View mode */
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      <span style={{ fontSize: '0.8rem', color: '#999' }}>{cat.slug}</span>
                      <span style={{ fontSize: '0.75rem', color: '#999' }}>#{cat.sortOrder}</span>
                    </div>
                    {cat.description && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.15rem' }}>{cat.description}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#999' }}>{cat._count?.skills || 0} 技能</span>
                    <button onClick={() => startEdit(cat)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: '#fff' }}>编辑</button>
                    <button onClick={() => deleteCategory(cat.slug, cat.name)} disabled={actionLoading} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', background: '#fff', color: '#dc2626' }}>删除</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
