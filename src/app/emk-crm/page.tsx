'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { vnd, vndShort } from '@/lib/format';

interface DashData {
    recentSignups: number; trialCount: number; activeCount: number;
    recentAccounts: Array<{ id: string; workspaceId: string; plan: string; createdAt: string; workspace: { name: string } }>;
    tasksDue: Array<{ id: string; title: string; type: string; dueDate: string | null }>;
    churnRisk: Array<{ id: string; workspace: { name: string }; trialEndAt: string | null }>;
}

interface FinancialData {
    totalBalance: number;
    totalDeposits: number;
    totalSpent: number;
    walletCount: number;
    recentTopups: Array<{
        id: string; userId: string; amount: number; status: string;
        transferContent: string; createdAt: string; confirmedAt: string | null;
    }>;
    revenuePlan: Array<{ plan: string; count: number; revenue: number }>;
    totalRevenue: number;
}

export default function EmkDashboard() {
    const [data, setData] = useState<DashData | null>(null);
    const [finance, setFinance] = useState<FinancialData>({
        totalBalance: 0, totalDeposits: 0, totalSpent: 0,
        walletCount: 0, recentTopups: [], revenuePlan: [], totalRevenue: 0,
    });
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/emk-crm/accounts').then(r => r.json()),
            fetch('/api/emk-crm/tasks').then(r => r.json()),
        ]).then(([accountsData, tasksData]) => {
            const accounts = accountsData.accounts || [];
            // Recent signups = new accounts in last 7 days
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentSignups = accounts.filter((a: { createdAt: string }) => new Date(a.createdAt) > weekAgo).length;
            setData({
                recentSignups,
                trialCount: accounts.filter((a: { plan: string }) => a.plan === 'TRIAL').length,
                activeCount: accounts.filter((a: { status: string }) => a.status === 'ACTIVE').length,
                recentAccounts: accounts.slice(0, 5),
                tasksDue: (tasksData.tasks || []).slice(0, 5),
                churnRisk: accounts.filter((a: { status: string; trialEndAt: string | null }) =>
                    a.status === 'TRIAL' && a.trialEndAt && new Date(a.trialEndAt) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                ).slice(0, 5),
            });

            const planPrices: Record<string, number> = { FREE: 0, TRIAL: 0, STARTER: 299000, PRO: 799000 };
            const planGroups: Record<string, number> = {};
            for (const a of accounts) { const plan = a.plan || 'FREE'; planGroups[plan] = (planGroups[plan] || 0) + 1; }
            const revenuePlan = Object.entries(planGroups).map(([plan, count]) => ({
                plan, count, revenue: count * (planPrices[plan] || 0),
            }));

            setFinance(prev => ({ ...prev, revenuePlan, totalRevenue: revenuePlan.reduce((s, r) => s + r.revenue, 0) }));
        });

        Promise.all([
            fetch('/api/emk-crm/wallets').then(r => r.json()).catch(() => ({ wallets: [] })),
            fetch('/api/emk-crm/topups').then(r => r.json()).catch(() => ({ topups: [] })),
        ]).then(([walletsData, topupsData]) => {
            const wallets = walletsData.wallets || [];
            const topups = topupsData.topups || [];
            const totalBalance = wallets.reduce((s: number, w: { balance: number }) => s + w.balance, 0);
            const confirmedTopups = topups.filter((t: { status: string }) => t.status === 'CONFIRMED');
            const totalDeposits = confirmedTopups.reduce((s: number, t: { amount: number }) => s + t.amount, 0);
            setFinance(prev => ({ ...prev, totalBalance, totalDeposits, totalSpent: totalDeposits - totalBalance, walletCount: wallets.length, recentTopups: topups.slice(0, 5) }));
        });
    }, []);

    const fetchAiSummary = () => {
        setAiLoading(true);
        fetch('/api/ai/summary')
            .then(r => r.json())
            .then(d => { setAiSummary(d.summary); setAiLoading(false); })
            .catch(() => { setAiSummary('Không thể tạo tóm tắt AI.'); setAiLoading(false); });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (data && !aiSummary && !aiLoading) fetchAiSummary(); }, [data]);

    const fmtMoney = vndShort;
    const fmtFull = vnd;
    const statusColor: Record<string, string> = { PENDING: '#f59e0b', CONFIRMED: '#22c55e', EXPIRED: '#9ca3af', CANCELED: '#ef4444' };
    const statusLabel: Record<string, string> = { PENDING: 'Chờ', CONFIRMED: 'Đã nạp', EXPIRED: 'Hết hạn', CANCELED: 'Huỷ' };

    if (!data) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="emk-skeleton" style={{ height: i === 1 ? '100px' : '120px' }} />
            ))}
        </div>
    );

    return (
        <div className="emk-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Tổng quan</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Cập nhật tình hình kinh doanh</p>
            </div>

            {/* AI Summary */}
            <div style={{ padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))', border: '1px solid rgba(99,102,241,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>🤖 AI Tóm tắt</span>
                    <button onClick={fetchAiSummary} disabled={aiLoading} style={{ background: 'none', border: 'none', cursor: aiLoading ? 'default' : 'pointer', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {aiLoading ? '⏳ Đang phân tích...' : '🔄 Làm mới'}
                    </button>
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {aiLoading ? <span style={{ fontStyle: 'italic' }}>AI đang phân tích dữ liệu...</span> : aiSummary || 'Đang tải...'}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid-kpi-3">
                {[
                    { label: 'Đăng ký mới', value: data.recentSignups, icon: '🎯', color: '#6366f1' },
                    { label: 'Dùng thử', value: data.trialCount, icon: '⏱', color: '#f59e0b' },
                    { label: 'Đang dùng', value: data.activeCount, icon: '✅', color: '#22c55e' },
                ].map(k => (
                    <div key={k.label} style={{ padding: '16px 14px', borderRadius: '16px', background: `${k.color}08`, border: `1px solid ${k.color}20`, textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{k.icon}</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* 💰 Financial Cards */}
            <div className="grid-finance-2">
                <div style={{ padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
                    <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600 }}>💰 Tổng doanh thu</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>{fmtMoney(finance.totalRevenue)}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>Từ gói dịch vụ</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white' }}>
                    <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600 }}>📥 Tổng nạp ví</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>{fmtMoney(finance.totalDeposits)}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>{finance.walletCount} tài khoản ví</div>
                </div>
            </div>

            {/* Sub stats */}
            <div className="grid-stat-3">
                <div style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#6366f1' }}>{fmtMoney(finance.totalBalance)}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng dư ví</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>{fmtMoney(Math.max(finance.totalSpent, 0))}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Đã chi tiêu</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e' }}>{finance.walletCount}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Ví hoạt động</div>
                </div>
            </div>

            {/* Revenue by Plan */}
            {(finance.revenuePlan || []).length > 0 && (
                <Section title="💰 Doanh thu theo gói" link="/emk-crm/dashboard" linkLabel="Chi tiết">
                    {(finance.revenuePlan || []).map(r => (
                        <div key={r.plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: r.plan === 'PRO' ? '#6366f115' : r.plan === 'STARTER' ? '#3b82f615' : '#9ca3af15', color: r.plan === 'PRO' ? '#6366f1' : r.plan === 'STARTER' ? '#3b82f6' : '#9ca3af' }}>{{ TRIAL: 'Dùng thử', FREE: 'Miễn phí', STARTER: 'Starter', PRO: 'Pro', PREMIUM: 'Premium' }[r.plan] || r.plan || 'Khác'}</span>
                                <span style={{ fontWeight: 600 }}>{r.count} TK</span>
                            </div>
                            <span style={{ fontWeight: 700, color: r.revenue > 0 ? '#22c55e' : 'var(--text-muted)' }}>{fmtFull(r.revenue)}</span>
                        </div>
                    ))}
                </Section>
            )}

            {/* Recent Topups */}
            {(finance.recentTopups || []).length > 0 && (
                <Section title="📥 Nạp tiền gần đây" link="/emk-crm/topups" linkLabel="Xem tất cả">
                    {(finance.recentTopups || []).map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                            <div>
                                <span style={{ fontWeight: 700 }}>{fmtFull(t.amount)}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}><code>{t.transferContent}</code></span>
                            </div>
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: `${statusColor[t.status] || '#999'}15`, color: statusColor[t.status] || '#999' }}>
                                {statusLabel[t.status] || t.status}
                            </span>
                        </div>
                    ))}
                </Section>
            )}

            {/* Quick actions */}
            <div className="grid-actions-2">
                <QuickAction href="/emk-crm/accounts" icon="🎯" label="Tài khoản" desc="Quản lý người dùng" />
                <QuickAction href="/emk-crm/tasks" icon="✅" label="Công việc" desc="Việc cần xử lý" />
                <QuickAction href="/emk-crm/wallets" icon="💰" label="Quản lý ví" desc="Số dư & nạp tiền" />
                <QuickAction href="/emk-crm/dashboard" icon="📈" label="Dashboard" desc="Phễu & biểu đồ" />
            </div>

            {/* Churn risk */}
            {data.churnRisk.length > 0 && (
                <Section title="⚠️ Sắp hết hạn dùng thử" link="/emk-crm/accounts" linkLabel="Xem tất cả" accent="rgba(239,68,68,0.06)" border="rgba(239,68,68,0.15)">
                    {data.churnRisk.map(a => (
                        <Row key={a.id} left={a.workspace.name} right={a.trialEndAt ? `Hết hạn ${new Date(a.trialEndAt).toLocaleDateString('vi-VN')}` : '—'} rightColor="#ef4444" />
                    ))}
                </Section>
            )}

            {/* Tasks */}
            <Section title="Công việc cần làm" link="/emk-crm/tasks" linkLabel="Xem tất cả">
                {data.tasksDue.length === 0
                    ? <EmptyRow text="Không có việc nào đang chờ" />
                    : data.tasksDue.map(t => <Row key={t.id} left={t.title} right={t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'Không có hạn'} />)
                }
            </Section>

            {/* Recent signups */}
            <Section title="Đăng ký gần đây" link="/emk-crm/accounts" linkLabel="Xem tất cả">
                {data.recentAccounts.length === 0
                    ? <EmptyRow text="Chưa có đăng ký nào" />
                    : data.recentAccounts.map(a => <Row key={a.id} left={a.workspace?.name || 'N/A'} right={new Date(a.createdAt).toLocaleDateString('vi-VN')} />)
                }
            </Section>
        </div>
    );
}

function QuickAction({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
    return (
        <Link href={href} style={{ padding: '14px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
        </Link>
    );
}

function Section({ title, link, linkLabel, children, accent, border }: { title: string; link: string; linkLabel: string; children: React.ReactNode; accent?: string; border?: string }) {
    return (
        <div style={{ padding: '16px', borderRadius: '16px', background: accent || 'var(--bg-card)', border: `1px solid ${border || 'var(--border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{title}</h2>
                <Link href={link} style={{ fontSize: '12px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>{linkLabel} →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>{children}</div>
        </div>
    );
}

function Row({ left, right, rightColor }: { left: string; right: string; rightColor?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
            <span style={{ fontWeight: 600 }}>{left}</span>
            <span style={{ color: rightColor || 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>{right}</span>
        </div>
    );
}

function EmptyRow({ text }: { text: string }) {
    return <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0', margin: 0, textAlign: 'center' }}>{text}</p>;
}
