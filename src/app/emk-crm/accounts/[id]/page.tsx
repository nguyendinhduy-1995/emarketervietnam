'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { vnd } from '@/lib/format';

interface AccountDetail {
    id: string;
    workspaceId: string;
    plan: string;
    status: string;
    trialStartAt: string;
    trialEndAt: string | null;
    lastActivityAt: string | null;
    createdAt: string;
    healthScore: number;
    trialDaysLeft: number | null;
    memberCount: number;
    workspace: {
        name: string;
        slug: string;
        product: string;
        status: string;
        memberships: Array<{ user: { id: string; name: string; email: string }; role: string }>;
        entitlements: Array<{ moduleKey: string; activeFrom: string; activeTo: string | null }>;
        subscriptions: Array<{ planKey: string; status: string; currentPeriodEnd: string | null }>;
        paymentTxns: Array<{ id: string; amount: number; description: string | null; paidAt: string; provider: string }>;
    };
    tasks: Array<{ id: string; title: string; type: string; status: string; dueDate: string | null; owner: { name: string } | null }>;
    notes: Array<{ id: string; content: string; createdAt: string }>;
}

const PLAN_COLORS: Record<string, string> = { TRIAL: '#f59e0b', STARTER: '#3b82f6', PRO: '#6366f1' };
const STATUS_COLORS: Record<string, string> = { TRIAL: '#f59e0b', ACTIVE: '#22c55e', PAST_DUE: '#ef4444', CHURNED: '#9ca3af' };
const MODULE_ICONS: Record<string, string> = { SPA_CRM: '💆', BOOKING: '📅', POS: '💳', INVENTORY: '📦', MARKETING: '📣', ANALYTICS: '📊', MESSAGING: '💬' };

export default function AccountDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [data, setData] = useState<AccountDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'billing' | 'tasks'>('info');

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/emk-crm/accounts/${id}`)
            .then(r => r.json())
            .then(d => { if (!d.error) setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{ height: i === 1 ? '120px' : '200px', borderRadius: '16px', background: 'var(--bg-card)', animation: 'ap 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes ap { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );

    if (!data) return <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không tìm thấy tài khoản.</p>;

    const healthColor = data.healthScore >= 70 ? '#22c55e' : data.healthScore >= 40 ? '#f59e0b' : '#ef4444';
    const healthLabel = data.healthScore >= 70 ? 'Tốt' : data.healthScore >= 40 ? 'Trung bình' : 'Cần chú ý';
    const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('vi-VN') : '–';
    const fmtMoney = vnd;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Back + Header */}
            <button onClick={() => router.push('/emk-crm/accounts')} style={{
                background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, padding: 0, fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '4px',
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg> Tất cả tài khoản
            </button>

            {/* Account header card */}
            <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>{data.workspace.name}</h1>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.workspace.slug} · {data.workspace.product}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, background: `${PLAN_COLORS[data.plan] || '#999'}15`, color: PLAN_COLORS[data.plan] || '#999', border: `1px solid ${PLAN_COLORS[data.plan] || '#999'}30` }}>
                            {data.plan}
                        </span>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, background: `${STATUS_COLORS[data.status] || '#999'}15`, color: STATUS_COLORS[data.status] || '#999', border: `1px solid ${STATUS_COLORS[data.status] || '#999'}30` }}>
                            {data.status}
                        </span>
                    </div>
                </div>

                {/* Health + KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: `${healthColor}08`, border: `1px solid ${healthColor}20`, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: healthColor }}>{data.healthScore}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Health · {healthLabel}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#6366f1' }}>{data.memberCount}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Thành viên</div>
                    </div>
                    {data.trialDaysLeft !== null && (
                        <div style={{ padding: '12px', borderRadius: '12px', background: data.trialDaysLeft <= 3 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.06)', border: `1px solid ${data.trialDaysLeft <= 3 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)'}`, textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: data.trialDaysLeft <= 3 ? '#ef4444' : '#f59e0b' }}>{data.trialDaysLeft}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Ngày trial còn lại</div>
                        </div>
                    )}
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#22c55e' }}>{data.workspace.entitlements?.length || 0}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Modules</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)' }}>
                {(['info', 'billing', 'tasks'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                        fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                        background: activeTab === t ? 'var(--accent-primary)' : 'transparent',
                        color: activeTab === t ? 'white' : 'var(--text-muted)',
                        transition: 'all 150ms ease',
                    }}>
                        {t === 'info' ? '📋 Chi tiết' : t === 'billing' ? '💳 Thanh toán' : '✅ Tasks'}
                    </button>
                ))}
            </div>

            {/* Tab: Info */}
            {activeTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Workspace info */}
                    <Card title="Thông tin workspace">
                        <InfoRow label="Tên" value={data.workspace.name} />
                        <InfoRow label="Slug" value={data.workspace.slug} />
                        <InfoRow label="Ngành" value={data.workspace.product} />
                        <InfoRow label="Ngày tạo" value={fmtDate(data.createdAt)} />
                        <InfoRow label="Trial bắt đầu" value={fmtDate(data.trialStartAt)} />
                        <InfoRow label="Trial kết thúc" value={fmtDate(data.trialEndAt)} />
                        <InfoRow label="Hoạt động cuối" value={fmtDate(data.lastActivityAt)} />
                    </Card>

                    {/* Active modules */}
                    <Card title={`Modules (${data.workspace.entitlements?.length || 0})`}>
                        {(data.workspace.entitlements?.length || 0) === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Chưa có module nào</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {data.workspace.entitlements.map((e, i) => (
                                    <span key={i} style={{
                                        padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                                        color: 'var(--accent-primary)',
                                    }}>
                                        {MODULE_ICONS[e.moduleKey] || '📦'} {e.moduleKey}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Team */}
                    <Card title={`Thành viên (${data.workspace.memberships?.length || 0})`}>
                        {(data.workspace.memberships?.length || 0) === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Chưa có thành viên</p>
                        ) : data.workspace.memberships.map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.user.name || 'Chưa rõ'}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.user.email}</div>
                                </div>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: m.role === 'OWNER' ? 'rgba(99,102,241,0.1)' : 'var(--bg-input)', color: m.role === 'OWNER' ? '#6366f1' : 'var(--text-muted)' }}>
                                    {m.role}
                                </span>
                            </div>
                        ))}
                    </Card>

                    {/* Notes */}
                    {data.notes.length > 0 && (
                        <Card title={`Ghi chú (${data.notes.length})`}>
                            {data.notes.map((n, i) => (
                                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                                    <div>{n.content}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{fmtDate(n.createdAt)}</div>
                                </div>
                            ))}
                        </Card>
                    )}
                </div>
            )}

            {/* Tab: Billing */}
            {activeTab === 'billing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Subscription */}
                    <Card title="Gói hiện tại">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: PLAN_COLORS[data.plan] || '#6366f1' }}>{data.plan}</div>
                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, background: `${STATUS_COLORS[data.status] || '#999'}15`, color: STATUS_COLORS[data.status] || '#999' }}>
                                {data.status}
                            </span>
                        </div>
                        {data.workspace.subscriptions?.[0] && (
                            <InfoRow label="Kỳ thanh toán kết thúc" value={fmtDate(data.workspace.subscriptions[0].currentPeriodEnd)} />
                        )}
                    </Card>

                    {/* Payment history */}
                    <Card title={`Lịch sử thanh toán (${data.workspace.paymentTxns?.length || 0})`}>
                        {(data.workspace.paymentTxns?.length || 0) === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Chưa có giao dịch</p>
                        ) : data.workspace.paymentTxns.map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.description || 'Thanh toán'}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtDate(p.paidAt)} · {p.provider}</div>
                                </div>
                                <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '14px' }}>{fmtMoney(p.amount)}</span>
                            </div>
                        ))}
                    </Card>
                </div>
            )}

            {/* Tab: Tasks */}
            {activeTab === 'tasks' && (
                <Card title={`Công việc liên quan (${data.tasks?.length || 0})`}>
                    {(data.tasks?.length || 0) === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Chưa có task nào</p>
                    ) : data.tasks.map((t, i) => {
                        const isOverdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date();
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: t.status === 'DONE' ? '#22c55e' : isOverdue ? '#ef4444' : 'var(--text-primary)' }}>
                                            {t.status === 'DONE' ? '✅' : isOverdue ? '🔴' : '⬜'} {t.title}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                        <span>{t.type}</span>
                                        {t.owner && <span>→ {t.owner.name}</span>}
                                        {t.dueDate && <span style={{ color: isOverdue ? '#ef4444' : undefined }}>📅 {fmtDate(t.dueDate)}</span>}
                                    </div>
                                </div>
                                <span style={{
                                    padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                    background: t.status === 'DONE' ? 'rgba(34,197,94,0.1)' : t.status === 'CANCELLED' ? 'rgba(156,163,175,0.1)' : 'rgba(99,102,241,0.1)',
                                    color: t.status === 'DONE' ? '#22c55e' : t.status === 'CANCELLED' ? '#9ca3af' : '#6366f1',
                                }}>
                                    {t.status}
                                </span>
                            </div>
                        );
                    })}
                </Card>
            )}
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>{title}</h3>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
    );
}
