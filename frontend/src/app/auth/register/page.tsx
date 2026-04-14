'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.username, form.password, form.displayName || undefined);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 500 as const, marginBottom: '0.25rem' };

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>注册</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>创建 OpenSkillHub 账号</p>

      {error && (
        <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>邮箱</label>
          <input type="email" value={form.email} onChange={update('email')} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>用户名</label>
          <input value={form.username} onChange={update('username')} required minLength={2} maxLength={64} style={inputStyle} placeholder="小写字母、数字、下划线" />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>显示名称 <span style={{ color: '#999', fontWeight: 400 }}>(可选)</span></label>
          <input value={form.displayName} onChange={update('displayName')} maxLength={128} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>密码</label>
          <input type="password" value={form.password} onChange={update('password')} required minLength={8} style={inputStyle} placeholder="至少 8 位" />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>确认密码</label>
          <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required style={inputStyle} />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.625rem', background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666', fontSize: '0.875rem' }}>
        已有账号？ <a href="/auth/login" style={{ color: '#2563eb' }}>登录</a>
      </p>
    </div>
  );
}
