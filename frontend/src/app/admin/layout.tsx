'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin', label: '总览', icon: '📊' },
  { href: '/admin/users', label: '用户管理', icon: '👥' },
  { href: '/admin/skills', label: '技能管理', icon: '⚡' },
  { href: '/admin/categories', label: '分类管理', icon: '📂' },
  { href: '/admin/tags', label: '标签管理', icon: '🏷️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>加载中...</div>;
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      {/* Sidebar */}
      <nav style={{ width: '200px', flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: '#dc2626' }}>
            管理后台
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: '#333',
                  fontSize: '0.9rem',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
            <Link href="/dashboard" style={{ fontSize: '0.85rem', color: '#666' }}>
              ← 返回 Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
