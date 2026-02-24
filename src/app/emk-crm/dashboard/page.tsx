'use client';
import { useEffect, useState, useCallback } from 'react';
import { vnd, vndShort } from '@/lib/format';

interface FunnelItem { stage: string; count: number }
interface VelocityItem { week: string; count: number }
interface RevenueItem { plan: string; count: number; revenue: number }
interface TeamItem { ownerId: string; name: string; accounts: number; tasks: number }
interface DashboardData {
    funnel: FunnelItem[];
    totalAccounts: number;
    velocity: VelocityItem[];
    revenue: RevenueItem[];
    totalRevenue: number;
    teamPerformance: TeamItem[];
    stats: {
        newSignupsWeek: number; newSignupsMonth: number; activeAccounts: number;
        totalTasks: number; completedTasks: number; taskRate: number;
        conversionRate: number; overdueTasks: number;
    };
}

const STAGE_LABELS: Record<string, string> = {
    NEW: 'Mới', CONTACTED: 'Đã LH', ONBOARDING: 'Onboard',
    ACTIVE: 'Active', RENEWAL: 'Gia hạn', AT_RISK: 'Rủi ro',
    CHURNED: 'Churn', LOST: 'Mất',
};
const STAGE_COLORS: Record<string, string> = {
    NEW: '#6366f1', CONTACTED: '#3b82f6', ONBOARDING: '#8b5cf6',
    ACTIVE: '#22c55e', RENEWAL: '#14b8a6', AT_RISK: '#f59e0b',
    CHURNED: '#ef4444', LOST: '#9ca3af',
};

// SVG icons for dashboard
function DIcon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
    const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (name) {
        case 'target': return <svg {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
        case 'chart': return <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
        case 'building': return <svg {...p}><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /></svg>;
        case 'check': return <svg {...p}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
        case 'funnel': return <svg {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
        case 'trending': return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
        case 'dollar': return <svg {...p}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
        case 'users': return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
        case 'warning': return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
        default: return null;
    }
}

export default function CrmDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [insights, setInsights] = useState<string[]>([]);
    const [insightsLoading, setInsightsLoading] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/emk-crm/dashboard')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);
    useEffect(load, [load]);

    // Load AI insights
    const loadInsights = useCallback(() => {
        setInsightsLoading(true);
        fetch('/api/ai/insights')
            .then(r => r.json())
            .then(d => { setInsights(d.insights || []); setInsightsLoading(false); })
            .catch(() => setInsightsLoading(false));
    }, []);
    useEffect(() => { loadInsights(); }, [loadInsights]);

    const fmtMoney = vndShort;

    if (loading || !data) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ height: '120px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'dp 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes dp { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );

    // Safe defaults for arrays
    const funnel = data.funnel || [];
    const velocity = data.velocity || [];
    const revenue = data.revenue || [];
    const team = data.teamPerformance || [];
    const stats = data.stats || { newSignupsWeek: 0, newSignupsMonth: 0, activeAccounts: 0, totalTasks: 0, completedTasks: 0, taskRate: 0, conversionRate: 0, overdueTasks: 0 };

    const maxFunnel = Math.max(...funnel.map(f => f.count), 1);
    const maxVelocity = Math.max(...velocity.map(v => v.count), 1);
    const maxRevenue = Math.max(...revenue.map(r => r.revenue), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DIcon name="chart" size={22} color="var(--accent-primary)" /> CRM Dashboard
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Phân tích chuyển đổi, tăng trưởng và hiệu suất đội ngũ
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid-finance-2">
                <KpiCard icon="target" label="Đăng ký tuần" value={stats.newSignupsWeek} color="#6366f1" />
                <KpiCard icon="chart" label="Đăng ký tháng" value={stats.newSignupsMonth} color="#3b82f6" />
                <KpiCard icon="building" label="Active" value={stats.activeAccounts} color="#22c55e" />
                <KpiCard icon="check" label="Tasks done" value={`${stats.taskRate}%`} color="#f59e0b" />
                <KpiCard icon="funnel" label="Conversion" value={`${stats.conversionRate}%`} color="#8b5cf6" />
                <KpiCard icon="warning" label="Quá hạn" value={stats.overdueTasks} color="#ef4444" />
            </div>

            {/* AI Insights */}
            <div style={{
                padding: '16px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(99,102,241,0.06))',
                border: '1px solid rgba(139,92,246,0.15)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>🧠</span> AI Insights
                    </h3>
                    <button onClick={loadInsights} disabled={insightsLoading} style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: 'none',
                        cursor: insightsLoading ? 'wait' : 'pointer', fontFamily: 'inherit',
                    }}>{insightsLoading ? '⏳' : '↻'} Làm mới</button>
                </div>
                {insightsLoading && insights.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        <span style={{ display: 'inline-block', animation: 'dp 1.5s ease-in-out infinite' }}>🧠 Đang phân tích dữ liệu...</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {insights.map((insight, i) => (
                            <div key={i} style={{
                                padding: '8px 12px', borderRadius: '10px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                fontSize: '13px', lineHeight: 1.5, color: 'var(--text-primary)',
                            }}>{insight}</div>
                        ))}
                    </div>
                )}
            </div>

            {/* Conversion Funnel */}
            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DIcon name="funnel" size={16} color="var(--accent-primary)" /> Phễu chuyển đổi
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {funnel.filter(f => f.count > 0).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có dữ liệu phễu</div>
                    ) : funnel.filter(f => f.count > 0).map(f => (
                        <div key={f.stage} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '60px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                {STAGE_LABELS[f.stage] || f.stage}
                            </span>
                            <div style={{ flex: 1, height: '20px', borderRadius: '4px', background: 'var(--bg-input)', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(f.count / maxFunnel) * 100}%`, height: '100%',
                                    background: STAGE_COLORS[f.stage] || '#6366f1',
                                    borderRadius: '4px', transition: 'width 500ms ease',
                                    display: 'flex', alignItems: 'center', paddingLeft: '6px',
                                }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'white' }}>{f.count}</span>
                                </div>
                            </div>
                            <span style={{ width: '30px', fontSize: '11px', textAlign: 'right', color: 'var(--text-muted)' }}>
                                {data.totalAccounts > 0 ? Math.round((f.count / data.totalAccounts) * 100) : 0}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* User Growth Velocity */}
            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DIcon name="trending" size={16} color="#22c55e" /> Tốc độ đăng ký mới (4 tuần)
                </h3>
                {velocity.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có dữ liệu</div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
                        {velocity.map((v, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{v.count}</span>
                                <div style={{
                                    width: '100%', borderRadius: '6px 6px 0 0',
                                    height: `${Math.max((v.count / maxVelocity) * 100, 8)}%`,
                                    background: `linear-gradient(to top, #6366f1, #818cf8)`,
                                    transition: 'height 500ms ease',
                                }} />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{v.week}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Revenue by Plan */}
            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DIcon name="dollar" size={16} color="#f59e0b" /> Doanh thu theo gói
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Tổng: <b>{vnd(data.totalRevenue || 0)}</b>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {revenue.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có doanh thu</div>
                    ) : revenue.map(r => {
                        const planColors: Record<string, string> = { TRIAL: '#9ca3af', STARTER: '#3b82f6', PRO: '#6366f1' };
                        return (
                            <div key={r.plan} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '60px', fontSize: '12px', fontWeight: 700, color: planColors[r.plan] || '#666' }}>{r.plan}</span>
                                <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: 'var(--bg-input)', overflow: 'hidden' }}>
                                    <div style={{
                                        width: maxRevenue > 0 ? `${(r.revenue / maxRevenue) * 100}%` : '0%',
                                        height: '100%', borderRadius: '6px',
                                        background: planColors[r.plan] || '#6366f1',
                                        display: 'flex', alignItems: 'center', paddingLeft: '8px',
                                        transition: 'width 500ms ease', minWidth: r.revenue > 0 ? '40px' : '0',
                                    }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'white' }}>{fmtMoney(r.revenue)}</span>
                                    </div>
                                </div>
                                <span style={{ width: '24px', fontSize: '11px', textAlign: 'right', fontWeight: 600 }}>{r.count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Team Performance */}
            {team.length > 0 && (
                <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DIcon name="users" size={16} color="#8b5cf6" /> Hiệu suất đội ngũ
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {team.map(t => (
                            <div key={t.ownerId} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)',
                            }}>
                                <div><div style={{ fontSize: '13px', fontWeight: 700 }}>{t.name}</div></div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#6366f1' }}>{t.accounts}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TK</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e' }}>{t.tasks}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tasks</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
    return (
        <div style={{
            padding: '14px', borderRadius: '14px', textAlign: 'center',
            background: `${color}08`, border: `1px solid ${color}20`,
        }}>
            <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
                <DIcon name={icon} size={20} color={color} />
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        </div>
    );
}
