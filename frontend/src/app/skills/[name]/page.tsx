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
      <div className="skill-detail-header" style={{
        background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.06))',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{skill.displayName}</h1>
          {latestVersion && (
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '0.2rem 0.65rem', borderRadius: '12px' }}>
              v{latestVersion.version}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <Link href={`/authors/${skill.author.username}`} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>@{skill.author.username}</Link>
          {skill.license && <><span style={{ color: 'var(--text-muted)' }}>·</span> <span>{skill.license}</span></>}
          {skill.category && <><span style={{ color: 'var(--text-muted)' }}>·</span> <Link href={`/skills?category=${skill.category.slug}`} style={{ textDecoration: 'none', color: 'var(--link)' }}>{skill.category.name}</Link></>}
        </div>
        <p style={{ marginTop: '1rem', fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{skill.description}</p>

        {/* Stats row inside header */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '1rem' }}>↓</span> <strong style={{ color: 'var(--text)' }}>{skill.downloadCount.toLocaleString()}</strong> 下载
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '1rem' }}>📦</span> <strong style={{ color: 'var(--text)' }}>{skill.versions?.length ?? 0}</strong> 个版本
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '1rem' }}>🕐</span> 更新于 {new Date(skill.updatedAt).toLocaleDateString('zh-CN')}
          </div>
        </div>
      </div>

      {/* ── Tags ── */}
      {skill.tags && skill.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {skill.tags.map((tag) => (
            <span
              key={tag.slug}
              style={{
                padding: '0.25rem 0.7rem',
                background: 'linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.08))',
                border: '1px solid rgba(102,126,234,0.15)',
                borderRadius: '14px',
                fontSize: '0.8rem',
                color: 'var(--accent)',
                fontWeight: 500,
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
                padding: '0.3rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 500,
                background: supported ? 'var(--success-bg)' : 'var(--bg-secondary)',
                color: supported ? 'var(--success)' : 'var(--text-muted)',
                textDecoration: 'none',
                border: supported ? '1px solid var(--success)' : '1px solid var(--border)',
                transition: 'transform 0.15s',
              }}
            >
              {meta.label} {supported ? '✓' : '—'}
            </a>
          );
        })}
      </div>

      {/* ── Install Guide ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '4px', height: '1.25rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
          安装方式
        </h2>

        {/* Natural Language */}
        <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            💬 自然语言（推荐）
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            在 Agent 对话中直接说：
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: 'var(--bg-tertiary, var(--bg))', borderRadius: '6px', borderLeft: '3px solid var(--accent)', fontSize: '0.85rem' }}>
              帮我从 OpenSkillHub 安装 {skill.name} 技能
            </code>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: 'var(--bg-tertiary, var(--bg))', borderRadius: '6px', borderLeft: '3px solid var(--accent)', fontSize: '0.85rem' }}>
              Install the {skill.name} skill from OpenSkillHub
            </code>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Agent 会自动调用 osh.sh 搜索并安装到正确路径。需要先安装 OpenSkillHub local skill。
          </p>
        </div>

        {/* CLI */}
        <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            ⌨️ 命令行 (osh.sh)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <code style={{ display: 'block', padding: '0.6rem 1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              <span style={{ color: '#608b4e' }}># 安装最新版本</span>
              <br />osh.sh install {skill.name}
            </code>
            {latestVersion && (
              <code style={{ display: 'block', padding: '0.6rem 1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                <span style={{ color: '#608b4e' }}># 指定 Agent 安装</span>
                <br />osh.sh install {skill.name} --agent opencode
              </code>
            )}
          </div>
        </div>

        {/* Per-Agent Install Paths */}
        {allAgents.length > 0 && (
          <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
              📂 各 Agent 安装路径
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {allAgents.map((agentKey) => {
                const meta = AGENT_META[agentKey as AgentType];
                if (!meta) return null;
                return (
                  <div key={agentKey} style={{ padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-tertiary, var(--bg))' }}>
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
          <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
              📦 直接下载
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {latestVersion.packages.map((pkg) => (
                <a
                  key={pkg.agentType}
                  href={`${API_BASE}/skills/${skill.name}/versions/${latestVersion.version}/packages/${pkg.agentType}`}
                  className="skill-download-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.25rem',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'transform 0.15s, box-shadow 0.15s',
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
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: '4px', height: '1.25rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
        版本历史
      </h2>
      {!skill.versions?.length ? (
        <p style={{ color: 'var(--text-muted)' }}>暂无版本发布。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {skill.versions.map((v, idx) => (
            <div
              key={v.id}
              style={{
                padding: '1.25rem',
                border: idx === 0 ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: '12px',
                background: idx === 0 ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {idx === 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #667eea, #764ba2)' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem' }}>v{v.version}</strong>
                  {idx === 0 && (
                    <span style={{ fontSize: '0.7rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>
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
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '4px', height: '1.25rem', background: 'linear-gradient(180deg, #667eea, #764ba2)', borderRadius: '2px', display: 'inline-block' }} />
          下载趋势
        </h2>
        <Suspense fallback={<div style={{ color: 'var(--text-muted)' }}>加载统计...</div>}>
          <DownloadChart skillName={skill.name} />
        </Suspense>
      </div>

      {/* ── Footer Stats ── */}
      <div style={{
        marginTop: '2rem',
        padding: '1.25rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(102,126,234,0.06), rgba(118,75,162,0.04))',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span><strong style={{ color: 'var(--text)' }}>{skill.downloadCount.toLocaleString()}</strong> 总下载量</span>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <span>创建于 {new Date(skill.createdAt).toLocaleDateString('zh-CN')}</span>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <span>更新于 {new Date(skill.updatedAt).toLocaleDateString('zh-CN')}</span>
        {skill.homepageUrl && (
          <>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <a href={skill.homepageUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>🔗 主页</a>
          </>
        )}
      </div>
    </div>
  );
}
