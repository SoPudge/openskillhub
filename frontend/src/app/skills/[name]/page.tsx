import { apiFetch } from '@/lib/api';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import DownloadChart from './DownloadChart';
import { AGENT_LABELS, AGENT_META, type AgentType } from '@openskillhub/shared';
import { API_BASE } from '@/lib/constants';
import type { SkillWithMeta } from '@/lib/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default async function SkillDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  let skill: SkillWithMeta;
  try {
    skill = await apiFetch<SkillWithMeta>(`/skills/${name}`);
  } catch {
    notFound();
  }

  const latestVersion = skill.versions?.[0];
  const allAgents = [
    ...new Set(skill.versions?.flatMap((v) => v.packages.map((p) => p.agentType)) ?? []),
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '2rem' }}>{skill.displayName}</h1>
          {latestVersion && (
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              v{latestVersion.version}
            </span>
          )}
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          by <Link href={`/authors/${skill.author.username}`} style={{ fontWeight: 'bold' }}>@{skill.author.username}</Link>
          {skill.license && <> · {skill.license}</>}
          {skill.category && <> · <Link href={`/skills?category=${skill.category.slug}`}>{skill.category.name}</Link></>}
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '1.05rem' }}>{skill.description}</p>
      </div>

      {/* ── Tags ── */}
      {skill.tags && skill.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {skill.tags.map((tag) => (
            <span
              key={tag.slug}
              style={{
                padding: '0.2rem 0.6rem',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                fontSize: '0.8rem',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Supported Agents ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {Object.entries(AGENT_META).map(([key, meta]) => {
          const supported = allAgents.includes(key);
          return (
            <a
              key={key}
              href={meta.url}
              target="_blank"
              rel="noopener noreferrer"
              title={supported ? meta.description : `${meta.label} — 尚无包`}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                background: supported ? 'var(--success-bg)' : 'var(--bg-secondary)',
                color: supported ? 'var(--success)' : 'var(--text-muted)',
                textDecoration: 'none',
              }}
            >
              {meta.label} {supported ? '✓' : '—'}
            </a>
          );
        })}
      </div>

      {/* ── Install Guide ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>安装方式</h2>

        {/* Natural Language */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            💬 自然语言（推荐）
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            在 Agent 对话中直接说：
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: 'var(--bg-secondary)', borderRadius: '6px', borderLeft: '3px solid var(--accent)', fontSize: '0.85rem' }}>
              帮我从 OpenSkillHub 安装 {skill.name} 技能
            </code>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: 'var(--bg-secondary)', borderRadius: '6px', borderLeft: '3px solid var(--accent)', fontSize: '0.85rem' }}>
              Install the {skill.name} skill from OpenSkillHub
            </code>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Agent 会自动调用 osh.sh 搜索并安装到正确路径。需要先安装 OpenSkillHub local skill。
          </p>
        </div>

        {/* CLI */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            ⌨️ 命令行 (osh.sh)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              <span style={{ color: '#608b4e' }}># 安装最新版本</span>
              <br />osh.sh install {skill.name}
            </code>
            {latestVersion && (
              <code style={{ display: 'block', padding: '0.6rem 1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                <span style={{ color: '#608b4e' }}># 指定 Agent 安装</span>
                <br />osh.sh install {skill.name} --agent opencode
              </code>
            )}
          </div>
        </div>

        {/* Per-Agent Install Paths */}
        {allAgents.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              📂 各 Agent 安装路径
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {allAgents.map((agentKey) => {
                const meta = AGENT_META[agentKey as AgentType];
                if (!meta) return null;
                return (
                  <div key={agentKey} style={{ padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>
                        <a href={meta.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {meta.label}
                        </a>
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meta.description}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {meta.installPaths.map((p) => (
                        <code key={p} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'var(--border)', borderRadius: '4px' }}>
                          {p}{skill.name}/
                        </code>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Direct Download */}
        {latestVersion && latestVersion.packages.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
              📦 直接下载
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {latestVersion.packages.map((pkg) => (
                <a
                  key={pkg.agentType}
                  href={`${API_BASE}/skills/${skill.name}/versions/${latestVersion.version}/packages/${pkg.agentType}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    background: 'var(--accent)',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  ↓ {AGENT_LABELS[pkg.agentType as AgentType] || pkg.agentType}
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatBytes(pkg.fileSize)})</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Versions ── */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>版本历史</h2>
      {!skill.versions?.length ? (
        <p style={{ color: 'var(--text-muted)' }}>暂无版本发布。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {skill.versions.map((v, idx) => (
            <div
              key={v.id}
              style={{
                padding: '1rem',
                border: idx === 0 ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: '8px',
                background: idx === 0 ? 'var(--accent-bg)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem' }}>v{v.version}</strong>
                  {idx === 0 && (
                    <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                      LATEST
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>

              {v.changelog && (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {v.changelog}
                </p>
              )}

              {/* Agent packages for this version */}
              {v.packages.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {v.packages.map((pkg) => (
                    <a
                      key={pkg.agentType}
                      href={`${API_BASE}/skills/${skill.name}/versions/${v.version}/packages/${pkg.agentType}`}
                      title={pkg.checksumSha256 ? `SHA256: ${pkg.checksumSha256}` : undefined}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.3rem 0.7rem',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        color: 'var(--text)',
                        background: 'var(--bg-secondary)',
                      }}
                    >
                      ↓ {AGENT_LABELS[pkg.agentType as AgentType] || pkg.agentType}
                      <span style={{ color: 'var(--text-muted)' }}>({formatBytes(pkg.fileSize)})</span>
                    </a>
                  ))}
                </div>
              )}
              {v.packages.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>暂无包</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Download Stats Chart ── */}
      <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>下载趋势</h2>
        <Suspense fallback={<div style={{ color: 'var(--text-muted)' }}>加载统计...</div>}>>
          <DownloadChart skillName={skill.name} />
        </Suspense>
      </div>

      {/* ── Footer Stats ── */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <strong>{skill.downloadCount.toLocaleString()}</strong> 总下载量 ·
        创建于 {new Date(skill.createdAt).toLocaleDateString('zh-CN')} ·
        更新于 {new Date(skill.updatedAt).toLocaleDateString('zh-CN')}
        {skill.homepageUrl && (
          <> · <a href={skill.homepageUrl} target="_blank" rel="noopener noreferrer">主页</a></>
        )}
      </div>
    </div>
  );
}
