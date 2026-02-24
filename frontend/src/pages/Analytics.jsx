import { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import styles from './Dashboard.module.css';
import aStyles from './Analytics.module.css';

const STATUS_META = {
  new:       { label: 'New',       color: '#60a5fa' },
  contacted: { label: 'Contacted', color: '#facc15' },
  qualified: { label: 'Qualified', color: '#c084fc' },
  converted: { label: 'Converted', color: '#4ade80' },
  lost:      { label: 'Lost',      color: '#f87171' },
};

const SOURCE_COLORS = {
  website:      '#c8f135',
  referral:     '#60a5fa',
  social_media: '#c084fc',
  walk_in:      '#4ade80',
  phone:        '#facc15',
  other:        '#94a3b8',
};

export default function Analytics() {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/lead');
      setLeads(data.leads || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  if (loading) return (
    <div className={styles.empty}>
      <div className={styles.loadingSpinner} />
      <span>Loading analytics…</span>
    </div>
  );

  if (error) return (
    <div className={styles.empty}>
      <span style={{ color: 'var(--red)' }}>{error}</span>
    </div>
  );

  // ── Computed stats ──────────────────────────────────────────────────────────
  const total = leads.length;

  // Status breakdown
  const statusCounts = Object.keys(STATUS_META).reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length;
    return acc;
  }, {});

  // Source breakdown
  const sourceCounts = leads.reduce((acc, l) => {
    const src = l.source || 'other';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  // Conversion rate
  const conversionRate = total > 0
    ? ((statusCounts.converted / total) * 100).toFixed(1)
    : '0.0';

  // Loss rate
  const lossRate = total > 0
    ? ((statusCounts.lost / total) * 100).toFixed(1)
    : '0.0';

  // Leads over time (last 7 days)
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dailyCounts = last7Days.map(day => {
    const count = leads.filter(l => {
      const d = new Date(l.created_at);
      return d.toDateString() === day.toDateString();
    }).length;
    return { day, count, label: day.toLocaleDateString('en', { weekday: 'short' }) };
  });

  const maxDaily = Math.max(...dailyCounts.map(d => d.count), 1);

  // Top staff by leads created
  const staffLeads = leads.reduce((acc, l) => {
    const name = l.created_by_username || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const topStaff = Object.entries(staffLeads)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxStaff = topStaff[0]?.[1] || 1;

  return (
    <div className={aStyles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageSub}>{total} total leads tracked</p>
        </div>
        <button className={aStyles.refreshBtn} onClick={fetchLeads}>↻ Refresh</button>
      </header>

      {/* ── KPI Cards ── */}
      <div className={aStyles.kpiRow}>
        <KpiCard label="Total Leads"     value={total}           accent="#c8f135" icon="◈" />
        <KpiCard label="Converted"       value={statusCounts.converted} accent="#4ade80" icon="✓" />
        <KpiCard label="Conversion Rate" value={`${conversionRate}%`}   accent="#c084fc" icon="%" />
        <KpiCard label="Loss Rate"       value={`${lossRate}%`}         accent="#f87171" icon="✕" />
      </div>

      {/* ── Charts row ── */}
      <div className={aStyles.chartsRow}>

        {/* Status breakdown — horizontal bars */}
        <div className={aStyles.chartCard}>
          <h3 className={aStyles.chartTitle}>Lead Status</h3>
          <div className={aStyles.barList}>
            {Object.entries(STATUS_META).map(([status, { label, color }]) => {
              const count = statusCounts[status] || 0;
              const pct   = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={status} className={aStyles.barRow}>
                  <span className={aStyles.barLabel}>{label}</span>
                  <div className={aStyles.barTrack}>
                    <div
                      className={aStyles.barFill}
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <span className={aStyles.barCount} style={{ color }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source breakdown — dot chart */}
        <div className={aStyles.chartCard}>
          <h3 className={aStyles.chartTitle}>Lead Sources</h3>
          <div className={aStyles.barList}>
            {Object.entries(sourceCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([src, count]) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                const color = SOURCE_COLORS[src] || '#94a3b8';
                return (
                  <div key={src} className={aStyles.barRow}>
                    <span className={aStyles.barLabel} style={{ textTransform: 'capitalize' }}>
                      {src.replace('_', ' ')}
                    </span>
                    <div className={aStyles.barTrack}>
                      <div
                        className={aStyles.barFill}
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className={aStyles.barCount} style={{ color }}>{count}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Daily sparkline — last 7 days */}
        <div className={aStyles.chartCard}>
          <h3 className={aStyles.chartTitle}>Last 7 Days</h3>
          <div className={aStyles.sparkline}>
            {dailyCounts.map(({ day, count, label }, i) => {
              const heightPct = (count / maxDaily) * 100;
              const isToday   = day.toDateString() === now.toDateString();
              return (
                <div key={i} className={aStyles.sparkCol}>
                  <div className={aStyles.sparkBarWrap}>
                    <div
                      className={aStyles.sparkBar}
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        background: isToday ? 'var(--acid)' : '#c8f13540',
                        borderColor: isToday ? 'var(--acid)' : '#c8f13580',
                      }}
                    />
                  </div>
                  <span className={aStyles.sparkCount}>{count}</span>
                  <span className={aStyles.sparkLabel} style={{ color: isToday ? 'var(--acid)' : undefined }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Staff leaderboard ── */}
      {topStaff.length > 0 && (
        <div className={aStyles.chartCard} style={{ flex: 'none' }}>
          <h3 className={aStyles.chartTitle}>Top Contributors</h3>
          <div className={aStyles.leaderboard}>
            {topStaff.map(([name, count], i) => {
              const pct = (count / maxStaff) * 100;
              const medals = ['◈', '◉', '◎', '⊙', '○'];
              return (
                <div key={name} className={aStyles.leaderRow}>
                  <span className={aStyles.leaderRank} style={{ color: i === 0 ? 'var(--acid)' : 'var(--text-muted)' }}>
                    {medals[i]}
                  </span>
                  <span className={aStyles.leaderName}>@{name}</span>
                  <div className={aStyles.barTrack} style={{ flex: 1 }}>
                    <div
                      className={aStyles.barFill}
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? 'var(--acid)' : '#c8f13540',
                      }}
                    />
                  </div>
                  <span className={aStyles.leaderCount}>{count} leads</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Funnel ── */}
      <div className={aStyles.chartCard} style={{ flex: 'none' }}>
        <h3 className={aStyles.chartTitle}>Conversion Funnel</h3>
        <div className={aStyles.funnel}>
          {['new', 'contacted', 'qualified', 'converted'].map((status, i) => {
            const count = statusCounts[status] || 0;
            const pct   = total > 0 ? (count / total) * 100 : 0;
            const { label, color } = STATUS_META[status];
            const width = 100 - i * 12;
            return (
              <div key={status} className={aStyles.funnelStep} style={{ width: `${width}%` }}>
                <div
                  className={aStyles.funnelBar}
                  style={{ background: `${color}22`, borderColor: `${color}66` }}
                >
                  <span className={aStyles.funnelLabel} style={{ color }}>{label}</span>
                  <span className={aStyles.funnelCount} style={{ color }}>{count}</span>
                  <span className={aStyles.funnelPct}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function KpiCard({ label, value, accent, icon }) {
  return (
    <div className={aStyles.kpiCard} style={{ '--accent': accent }}>
      <span className={aStyles.kpiIcon}>{icon}</span>
      <span className={aStyles.kpiValue}>{value}</span>
      <span className={aStyles.kpiLabel}>{label}</span>
      <div className={aStyles.kpiGlow} />
    </div>
  );
}