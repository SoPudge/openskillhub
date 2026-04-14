'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const AGENT_LABELS: Record<string, string> = {
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  goose: 'Goose',
  amp: 'Amp',
};

const AGENT_COLORS: Record<string, string> = {
  opencode: '#0070f3',
  openclaw: '#7c3aed',
  'claude-code': '#d97706',
  cursor: '#059669',
  goose: '#dc2626',
  amp: '#0891b2',
};

interface StatsData {
  totalDownloads: number;
  period: string;
  days: number;
  timeline: { date: string; count: number }[];
  byAgent: { agentType: string; count: number }[];
}

export default function DownloadChart({ skillName }: { skillName: string }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/skills/${skillName}/stats?period=${period}&days=${days}`)
      .then((r) => r.json())
      .then((data: StatsData) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [skillName, period, days]);

  if (loading) {
    return (
      <div style={{ padding: '1rem', color: '#999', textAlign: 'center' }}>加载统计...</div>
    );
  }

  if (!stats || stats.totalDownloads === 0) {
    return (
      <div style={{ padding: '1rem', color: '#999', fontSize: '0.9rem' }}>
        暂无下载数据
      </div>
    );
  }

  const maxCount = Math.max(...stats.timeline.map((t) => t.count), 1);
  const chartHeight = 120;
  const barWidth = Math.max(
    6,
    Math.min(24, Math.floor(600 / Math.max(stats.timeline.length, 1)) - 2),
  );
  const chartWidth = stats.timeline.length * (barWidth + 2) + 40;

  return (
    <div>
      {/* 周期选择 */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: '#666' }}>统计周期:</span>
        {(
          [
            { p: 'day' as const, d: 30, label: '30 天' },
            { p: 'day' as const, d: 90, label: '90 天' },
            { p: 'week' as const, d: 180, label: '26 周' },
            { p: 'month' as const, d: 365, label: '12 月' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.label}
            onClick={() => {
              setPeriod(opt.p);
              setDays(opt.d);
            }}
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              border:
                period === opt.p && days === opt.d
                  ? '1px solid #0070f3'
                  : '1px solid #ddd',
              background:
                period === opt.p && days === opt.d ? '#e8f4fd' : 'white',
              color:
                period === opt.p && days === opt.d ? '#0070f3' : '#666',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 柱状图 */}
      <div style={{ overflowX: 'auto' }}>
        <svg
          width={Math.max(chartWidth, 200)}
          height={chartHeight + 30}
          style={{ display: 'block' }}
        >
          {/* Y轴刻度线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - chartHeight * ratio;
            const val = Math.round(maxCount * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={35}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#f0f0f0"
                  strokeWidth={1}
                />
                <text
                  x={30}
                  y={y + 4}
                  textAnchor="end"
                  fill="#999"
                  fontSize={10}
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* 柱子 */}
          {stats.timeline.map((item, i) => {
            const barH = (item.count / maxCount) * chartHeight;
            const x = 40 + i * (barWidth + 2);
            return (
              <g key={item.date}>
                <rect
                  x={x}
                  y={chartHeight - barH}
                  width={barWidth}
                  height={Math.max(barH, 1)}
                  rx={2}
                  fill="#0070f3"
                  opacity={0.8}
                >
                  <title>
                    {item.date}: {item.count} 次下载
                  </title>
                </rect>
                {/* X轴标签 (每几个显示一个) */}
                {(i === 0 ||
                  i === stats.timeline.length - 1 ||
                  i % Math.max(Math.floor(stats.timeline.length / 6), 1) ===
                    0) && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 14}
                    textAnchor="middle"
                    fill="#999"
                    fontSize={9}
                  >
                    {item.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Agent 分布 */}
      {stats.byAgent.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div
            style={{
              fontSize: '0.85rem',
              color: '#666',
              marginBottom: '0.5rem',
            }}
          >
            按 Agent:
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {stats.byAgent.map((a) => (
              <div
                key={a.agentType}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background:
                      AGENT_COLORS[a.agentType] || '#999',
                    display: 'inline-block',
                  }}
                />
                <span>{AGENT_LABELS[a.agentType] || a.agentType}</span>
                <span style={{ color: '#999' }}>({a.count})</span>
              </div>
            ))}
          </div>
          {/* Agent 比例条 */}
          <div
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              height: 8,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {stats.byAgent.map((a) => (
              <div
                key={a.agentType}
                style={{
                  width: `${(a.count / stats.totalDownloads) * 100}%`,
                  background:
                    AGENT_COLORS[a.agentType] || '#999',
                  minWidth: 2,
                }}
                title={`${AGENT_LABELS[a.agentType] || a.agentType}: ${a.count}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
