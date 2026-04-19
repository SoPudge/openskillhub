'use client';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import Link from 'next/link';

export function HeaderNav() {
  const { user, loading } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', textDecoration: 'none', color: 'var(--text)' }}>
        OpenSkillHub
      </Link>
      <Link href="/skills">技能</Link>
      <Link href="/categories">分类</Link>
      <Link href="/teams">团队</Link>
      <Link href="/clawhub" style={{ color: '#8b5cf6' }}>ClawHub</Link>
      <Link href="/publish" style={{ color: 'var(--success)' }}>发布</Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={toggle}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.1rem', padding: '0.25rem',
          }}
          title={theme === 'dark' ? '切换浅色模式' : '切换暗色模式'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {loading ? null : user ? (
          <>
            {user.role === 'admin' && (
              <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 500 }}>
                管理
              </Link>
            )}
            <Link href="/dashboard" style={{ textDecoration: 'none', color: 'var(--text)', fontSize: '0.875rem' }}>
              {user.displayName || user.username}
            </Link>
            <Link href="/settings" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              ⚙
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth/login" style={{ fontSize: '0.875rem' }}>登录</Link>
            <Link href="/auth/register" style={{ padding: '0.375rem 0.75rem', background: 'var(--text)', color: 'var(--bg)', borderRadius: 6, textDecoration: 'none', fontSize: '0.875rem' }}>
              注册
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
