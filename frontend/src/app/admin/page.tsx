'use client';

import { useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/constants';
import { useCallback, useEffect, useState } from 'react';

interface AdminStats {
  totalUsers: number;
  totalSkills: number;
  totalDownloads: number;
  todayUsers: number;
  todaySkills: number;
  userTrend: { date: string; count: number }[];
  downloadTrend: { date: string; count: number }[];
}

export default function AdminPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) fetchStats();
  }, [token, fetchStats]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>加载中...</div>;
  }

  if (!stats) {
    return <div style={{ color: '#dc2626' }}>无法加载统计数据</div>;
  }

  const cardStyle = {
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: '10px',
    padding: '1.25rem',
    textAlign: 'center' as const,
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>系统总览</h1>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0070f3' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>总用户数</div>
          {stats.todayUsers > 0 && <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>+{stats.todayUsers} 今日</div>}
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>{stats.totalSkills}</div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>总技能数</div>
          {stats.todaySkills > 0 && <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>+{stats.todaySkills} 今日</div>}
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>{stats.totalDownloads.toLocaleString()}</div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>总下载量</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <TrendChart title="用户注册趋势 (30天)" data={stats.userTrend} color="#0070f3" />
        <TrendChart title="下载趋势 (30天)" data={stats.downloadTrend} color="#dc2626" />
      </div>
    </div>
  );
}

function TrendChart({ title, data, color }: { title: string; data: { date: string; count: number }[]; color: string }) {
  if (data.length === 0) {
    return (
      <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>{title}</h3>
        <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>暂无数据</div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 100;
  const barWidth = Math.max(4, Math.min(16, Math.floor(500 / Math.max(data.length, 1)) - 2));
  const chartWidth = data.length * (barWidth + 2) + 40;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>{title}</h3>
        <span style={{ fontSize: '0.85rem', color: '#999' }}>总计: {total}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={Math.max(chartWidth, 200)} height={chartHeight + 20} style={{ display: 'block' }}>
          {data.map((item, i) => {
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
                  fill={color}
                  opacity={0.7}
                >
                  <title>{item.date}: {item.count}</title>
                </rect>
                {(i === 0 || i === data.length - 1 || i % Math.max(Math.floor(data.length / 5), 1) === 0) && (
                  <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fill="#999" fontSize={8}>
                    {item.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
