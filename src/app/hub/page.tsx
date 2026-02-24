'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CoachCard from '@/components/CoachCard';

interface CmsPost {
    id: string; title: string; excerpt: string; category: string;
    createdAt: string; slug: string; body: string;
}

interface TodayData {
    alerts: Array<{ id: string; type: 'danger' | 'warning'; message: string }>;
    kpi: { label: string; current: number; target: number; percent: number };
    workspaces: Array<{ id: string; name: string; slug: string; status: string; role: string }>;
    hasCompletedOnboarding: boolean;
}

export default function HubDashboard() {
    const [data, setData] = useState<TodayData | null>(null);
    const [posts, setPosts] = useState<CmsPost[]>([]);
    const [openPost, setOpenPost] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/hub/today')
            .then(r => { if (!r.ok) throw new Error('Not available'); return r.json(); })
            .then(d => { setData(d); setLoading(false); })
            .catch(() => {
                // Fallback: show dashboard without today data
                setData({ alerts: [], kpi: { label: '', current: 0, target: 0, percent: 0 }, workspaces: [], hasCompletedOnboarding: false });
                setLoading(false);
            });

        // Fetch CMS articles
        fetch('/api/hub/cms')
            .then(r => r.json())
            .then(d => setPosts(d.posts || []))
            .catch(() => { });
    }, []);

    if (loading) return (
        <div style={{ padding: '40px 0' }}>
            {[1, 2, 3].map(i => (
                <div key={i} className="emk-skeleton" style={{ height: '72px', marginBottom: '12px' }} />
            ))}
        </div>
    );

    if (!data) return null;

    const catColors: Record<string, string> = {
        'Tin tức': '#3b82f6', 'Hướng dẫn': '#22c55e', 'Cập nhật': '#f59e0b', 'Khuyến mãi': '#ef4444',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Greeting */}
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Hôm nay</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>

            {/* Coach tip */}
            <CoachCard hasCompletedOnboarding={data.hasCompletedOnboarding} hasWorkspaces={data.workspaces.length > 0} taskCount={0} />

            {/* CTA chính */}
            {!data.hasCompletedOnboarding && (
                <Link href="/hub/onboarding" style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '18px 20px', borderRadius: '20px',
                    background: 'var(--accent-gradient)', color: 'white',
                    textDecoration: 'none', fontWeight: 600, fontSize: '15px',
                    boxShadow: 'var(--shadow-glow)',
                }}>
                    <span style={{ fontSize: '28px' }}>🚀</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Bắt đầu thiết lập</div>
                        <div style={{ fontSize: '12px', opacity: 0.85, fontWeight: 400 }}>Chỉ 2 phút – tạo không gian làm việc đầu tiên</div>
                    </div>
                </Link>
            )}

            {/* Alerts */}
            {data.alerts.length > 0 && (
                <section>
                    <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Cảnh báo</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.alerts.map(alert => (
                            <div key={alert.id} style={{
                                padding: '14px 16px', borderRadius: '14px',
                                background: alert.type === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                border: `1px solid ${alert.type === 'danger' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px',
                            }}>
                                <span style={{ fontSize: '18px' }}>{alert.type === 'danger' ? '🔴' : '🟡'}</span>
                                <span>{alert.message}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Quick shortcuts */}
            <div className="grid-actions-2">
                <Link href="/hub/marketplace" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <span style={{ fontSize: '24px' }}>🛒</span>
                    <div><div style={{ fontWeight: 700, fontSize: '14px' }}>Sản phẩm</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Khám phá công cụ</div></div>
                </Link>
                <Link href="/hub/account" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <span style={{ fontSize: '24px' }}>👤</span>
                    <div><div style={{ fontWeight: 700, fontSize: '14px' }}>Tài khoản</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ví, thanh toán, cài đặt</div></div>
                </Link>
            </div>

            {/* KPI Progress */}
            {data.kpi.target > 0 && (
                <section>
                    <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Tiến độ</h2>
                    <div style={{ padding: '18px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                            <span style={{ fontWeight: 600 }}>{data.kpi.label}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{data.kpi.current}/{data.kpi.target}</span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '4px', background: 'var(--accent-gradient)', width: `${data.kpi.percent}%`, transition: 'width 600ms ease' }} />
                        </div>
                    </div>
                </section>
            )}

            {/* Workspaces */}
            {data.workspaces.length > 0 && (
                <section>
                    <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Không gian làm việc</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.workspaces.map(ws => (
                            <Link key={ws.id} href={`/crm/${ws.slug}`} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                                textDecoration: 'none', color: 'var(--text-primary)',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{ws.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {ws.role === 'OWNER' ? 'Chủ sở hữu' : ws.role === 'ADMIN' ? 'Quản lý' : 'Nhân viên'} · {ws.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                                    </div>
                                </div>
                                <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>→</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* CMS Articles from CRM */}
            {posts.length > 0 && (
                <section>
                    <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Tin tức & Hướng dẫn</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {posts.slice(0, 5).map(post => (
                            <div key={post.id} onClick={() => setOpenPost(openPost === post.id ? null : post.id)}
                                style={{
                                    padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    cursor: 'pointer', transition: 'all 200ms ease',
                                    borderColor: openPost === post.id ? 'var(--accent-primary)' : 'var(--border)',
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                        background: `${catColors[post.category] || '#6366f1'}12`,
                                        color: catColors[post.category] || '#6366f1',
                                    }}>{post.category}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', transition: 'transform 200ms ease', transform: openPost === post.id ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{post.title}</h3>
                                {post.excerpt && openPost !== post.id && (
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{post.excerpt}</p>
                                )}
                                {openPost === post.id && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', animation: 'fadeIn 200ms ease' }}>
                                        {post.excerpt && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.6, fontStyle: 'italic' }}>{post.excerpt}</p>}
                                        <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)' }}>{post.body || 'Chưa có nội dung chi tiết.'}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                </section>
            )}
        </div>
    );
}
