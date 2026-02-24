'use client';
import { useEffect, useState, useCallback } from 'react';

interface PageData { page: string; views: number; avgScroll: number; uniqueVisitors: number }
interface CtaData { text: string; href: string; count: number }

interface LayerStats {
    totalPageViews: number;
    uniqueSessions: number;
    avgPagesPerSession: number;
    topPages: PageData[];
    ctaClicks: CtaData[];
    dailyData: Array<{ date: string; views: number }>;
    devices: Record<string, number>;
    browsers: Record<string, number>;
    utmSources: Record<string, number>;
    bounceRate: number;
}

interface AnalyticsResponse {
    totalEvents: number;
    landing: LayerStats;
    hub: LayerStats;
}

const DEVICE_ICONS: Record<string, string> = { mobile: '📱', desktop: '💻', tablet: '📋' };
const BROWSER_ICONS: Record<string, string> = { chrome: '🟢', safari: '🔵', firefox: '🟠', edge: '🔷' };
const BROWSER_COLORS: Record<string, string> = { chrome: '#22c55e', safari: '#3b82f6', firefox: '#f97316', edge: '#6366f1' };
const DEVICE_COLORS: Record<string, string> = { mobile: '#6366f1', desktop: '#22c55e', tablet: '#f59e0b' };

export default function CrmAnalyticsPage() {
    const [data, setData] = useState<AnalyticsResponse | null>(null);
    const [days, setDays] = useState(30);
    const [tab, setTab] = useState<'landing' | 'hub'>('landing');
    const [loading, setLoading] = useState(true);
    const [expandedPage, setExpandedPage] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/emk-crm/analytics?days=${days}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [days]);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ height: i === 1 ? '70px' : '160px', borderRadius: '16px', background: 'var(--bg-card)',  }} />
            ))}
        </div>
    );

    if (!data || (!data.landing && !data.hub)) return (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Không thể tải dữ liệu analytics.</p>
    );

    const stats = data[tab];
    const maxDaily = Math.max(...(stats.dailyData || []).map(d => d.views), 1);
    const totalDevices = Object.values(stats.devices || {}).reduce((a, b) => a + b, 0) || 1;
    const totalBrowsers = Object.values(stats.browsers || {}).reduce((a, b) => a + b, 0) || 1;
    const topPages = stats.topPages || [];
    const ctaClicks = stats.ctaClicks || [];
    const dailyData = stats.dailyData || [];

    // Colors per tab
    const accent = tab === 'landing' ? '#6366f1' : '#a855f7';
    const accentBg = tab === 'landing' ? 'rgba(99,102,241,' : 'rgba(168,85,247,';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                        </svg> Phân tích chi tiết
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        Theo dõi từng trang · {tab === 'landing' ? 'Trang đích' : 'Trang Hub'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {[7, 14, 30, 90].map(d => (
                        <button key={d} onClick={() => setDays(d)} style={{
                            padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            background: days === d ? accent : 'var(--bg-card)',
                            color: days === d ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${days === d ? accent : 'var(--border)'}`,
                            cursor: 'pointer', transition: 'all 150ms ease',
                        }}>
                            {d} ngày
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab toggle */}
            <div style={{
                display: 'flex', borderRadius: '14px', overflow: 'hidden',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
            }}>
                {(['landing', 'hub'] as const).map(t => (
                    <button key={t} onClick={() => { setTab(t); setExpandedPage(null); }} style={{
                        flex: 1, padding: '12px 16px', border: 'none', fontFamily: 'inherit',
                        fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                        background: tab === t ? (t === 'landing' ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'linear-gradient(135deg, #a855f7, #c084fc)') : 'transparent',
                        color: tab === t ? 'white' : 'var(--text-muted)',
                        transition: 'all 200ms ease',
                    }}>
                        {t === 'landing' ? '🌐 Trang đích' : '🏠 Trang Hub'}
                        <div style={{ fontSize: '11px', fontWeight: 500, marginTop: '2px', opacity: 0.8 }}>
                            {data[t].totalPageViews.toLocaleString()} lượt xem · {data[t].uniqueSessions} phiên
                        </div>
                    </button>
                ))}
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                <KpiCard icon="👁" label="Lượt xem" value={stats.totalPageViews} color={accent} />
                <KpiCard icon="👤" label="Phiên" value={stats.uniqueSessions} color="#8b5cf6" />
                <KpiCard icon="📄" label="Trang/Phiên" value={stats.avgPagesPerSession} color="#22c55e" isFloat />
                <KpiCard icon="↩️" label="Tỷ lệ thoát" value={`${stats.bounceRate}%`} color="#f59e0b" />
                <KpiCard icon="📡" label="Sự kiện" value={data.totalEvents} color="#ec4899" />
            </div>

            {/* Daily trend */}
            <Section title={`📈 Lượt xem theo ngày (${tab === 'landing' ? 'Landing' : 'Hub'})`}>
                {dailyData.length === 0 ? <EmptyState text="Chưa có dữ liệu" /> : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px', padding: '0 4px' }}>
                            {dailyData.map((d, i) => {
                                const height = Math.max((d.views / maxDaily) * 100, 2);
                                return (
                                    <div key={i} title={`${d.date}: ${d.views} views`} style={{
                                        flex: 1, minWidth: 0,
                                        height: `${height}%`, borderRadius: '4px 4px 0 0',
                                        background: `linear-gradient(180deg, ${accent}, ${accentBg}0.3))`,
                                        transition: 'height 300ms ease', cursor: 'pointer',
                                    }} />
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                            <span>{dailyData[0]?.date.slice(5)}</span>
                            <span>{dailyData[dailyData.length - 1]?.date.slice(5)}</span>
                        </div>
                    </>
                )}
            </Section>

            {/* Detailed page-by-page breakdown */}
            <Section title={`📊 Chi tiết từng trang (${topPages.length} trang)`}>
                {topPages.length === 0 ? <EmptyState text="Chưa có dữ liệu" /> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {/* Table header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 70px 70px 60px', gap: '8px', padding: '6px 0', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--border)' }}>
                            <span>#</span><span>Trang</span><span style={{ textAlign: 'right' }}>Lượt xem</span><span style={{ textAlign: 'right' }}>Khách riêng</span><span style={{ textAlign: 'right' }}>Cuộn</span>
                        </div>
                        {topPages.map((p, i) => {
                            const isExpanded = expandedPage === p.page;
                            const viewPct = stats.totalPageViews > 0 ? Math.round(p.views / stats.totalPageViews * 100) : 0;
                            return (
                                <div key={i}>
                                    <button onClick={() => setExpandedPage(isExpanded ? null : p.page)} style={{
                                        display: 'grid', gridTemplateColumns: '28px 1fr 70px 70px 60px', gap: '8px', alignItems: 'center',
                                        padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '12px',
                                        width: '100%', background: isExpanded ? `${accentBg}0.04)` : 'none',
                                        border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                        color: 'var(--text-primary)',
                                    }}>
                                        <span style={{
                                            width: '22px', height: '22px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '10px', fontWeight: 700, flexShrink: 0,
                                            background: i < 3 ? accent : 'var(--bg-input)',
                                            color: i < 3 ? 'white' : 'var(--text-muted)',
                                        }}>
                                            {i + 1}
                                        </span>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, fontSize: '13px' }}>
                                            {p.page}
                                        </span>
                                        <span style={{ textAlign: 'right', fontWeight: 700, color: accent }}>{p.views.toLocaleString()}</span>
                                        <span style={{ textAlign: 'right', fontWeight: 600, color: '#8b5cf6' }}>{p.uniqueVisitors}</span>
                                        <span style={{ textAlign: 'right', fontWeight: 600, color: p.avgScroll >= 70 ? '#22c55e' : p.avgScroll >= 40 ? '#f59e0b' : '#ef4444' }}>
                                            {p.avgScroll > 0 ? `${p.avgScroll}%` : '–'}
                                        </span>
                                    </button>
                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div style={{
                                            padding: '12px 16px', background: `${accentBg}0.04)`,
                                            borderBottom: '1px solid var(--border)', fontSize: '12px',
                                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Chi tiết</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span>Lượt xem</span><span style={{ fontWeight: 700 }}>{p.views.toLocaleString()}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span>Khách riêng</span><span style={{ fontWeight: 700 }}>{p.uniqueVisitors}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span>Cuộn trung bình</span><span style={{ fontWeight: 700 }}>{p.avgScroll > 0 ? `${p.avgScroll}%` : 'Không có'}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Tỷ trọng</div>
                                                <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginBottom: '6px' }}>
                                                    <div style={{ height: '100%', borderRadius: '4px', background: accent, width: `${viewPct}%`, transition: 'width 300ms ease' }} />
                                                </div>
                                                <div style={{ fontSize: '20px', fontWeight: 800, color: accent }}>{viewPct}%</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>của tổng {tab === 'landing' ? 'Landing' : 'Hub'}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Section>

            {/* CTA Clicks */}
            {ctaClicks.length > 0 && (
                <Section title="🎯 Nút bấm phổ biến (10 hàng đầu)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {ctaClicks.map((c, i) => {
                            const maxCta = ctaClicks[0]?.count || 1;
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>{i + 1}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.text || '(không có nội dung)'}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.href}</div>
                                    </div>
                                    <div style={{ width: '80px' }}>
                                        <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', borderRadius: '3px', background: '#22c55e', width: `${(c.count / maxCta) * 100}%`, transition: 'width 300ms ease' }} />
                                        </div>
                                    </div>
                                    <span style={{ width: '36px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>{c.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* Device + Browser */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Section title="📱 Thiết bị">
                    {Object.entries(stats.devices || {}).filter(([, v]) => v > 0).length === 0 ? <EmptyState text="N/A" /> :
                        Object.entries(stats.devices || {}).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([device, count]) => (
                            <div key={device} style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600 }}>{DEVICE_ICONS[device] || '⚪'} {device}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{Math.round(count / totalDevices * 100)}%</span>
                                </div>
                                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '3px', background: DEVICE_COLORS[device] || '#999', width: `${(count / totalDevices) * 100}%`, transition: 'width 600ms ease' }} />
                                </div>
                            </div>
                        ))}
                </Section>

                <Section title="🌐 Trình duyệt">
                    {Object.entries(stats.browsers || {}).filter(([, v]) => v > 0).length === 0 ? <EmptyState text="N/A" /> :
                        Object.entries(stats.browsers || {}).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([browser, count]) => (
                            <div key={browser} style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600 }}>{BROWSER_ICONS[browser] || '⚪'} {browser}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{Math.round(count / totalBrowsers * 100)}%</span>
                                </div>
                                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '3px', background: BROWSER_COLORS[browser] || '#999', width: `${(count / totalBrowsers) * 100}%`, transition: 'width 600ms ease' }} />
                                </div>
                            </div>
                        ))}
                </Section>
            </div>

            {/* UTM Sources */}
            {Object.keys(stats.utmSources || {}).length > 0 && (
                <Section title="🔗 Nguồn UTM">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(stats.utmSources).sort(([, a], [, b]) => b - a).map(([source, count]) => (
                            <span key={source} style={{
                                padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                                background: `${accentBg}0.08)`, border: `1px solid ${accentBg}0.15)`,
                                color: accent,
                            }}>
                                {source}: {count}
                            </span>
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}

// ── Shared components ──

function KpiCard({ icon, label, value, color, isFloat }: { icon: string; label: string; value: number | string; color: string; isFloat?: boolean }) {
    const display = typeof value === 'string' ? value : isFloat ? (value as number).toFixed(1) : (value as number).toLocaleString();
    return (
        <div style={{
            padding: '12px', borderRadius: '14px', textAlign: 'center',
            background: `${color}08`, border: `1px solid ${color}20`,
        }}>
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>{icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>{display}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>{title}</h2>
            {children}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', margin: 0, fontStyle: 'italic' }}>{text}</p>;
}
