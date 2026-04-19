'use client';

import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export function HeaderNav() {
  const { user, loading } = useAuth();

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', textDecoration: 'none', color: '#111' }}>
        OpenSkillHub
      </Link>
      <Link href="/skills">技能</Link>
      <Link href="/categories">分类</Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {loading ? null : user ? (
          <>
            {user.role === 'admin' && (
              <Link href="/admin" style={{ textDecoration: 'none', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                管理
              </Link>
            )}
            <Link href="/dashboard" style={{ textDecoration: 'none', color: '#111', fontSize: '0.875rem' }}>
              {user.displayName || user.username}
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth/login" style={{ fontSize: '0.875rem' }}>登录</Link>
            <Link href="/auth/register" style={{ padding: '0.375rem 0.75rem', background: '#111', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: '0.875rem' }}>
              注册
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
