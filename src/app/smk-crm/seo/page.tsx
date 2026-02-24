'use client';

import { useState } from 'react';

/* ═══ Types ═══ */
interface SeoPage {
    id: string;
    path: string;
    title: string;
    description: string;
    ogImage: string;
    indexable: boolean;
    score: number;
}

const DEMO_PAGES: SeoPage[] = [
    { id: 's1', path: '/', title: 'Siêu Thị Mắt Kính - Kính mắt chính hãng, giao nhanh toàn quốc', description: 'Mua kính cận, kính râm, gọng kính chính hãng. Kiểm tra mắt miễn phí. Bảo hành 12 tháng.', ogImage: '/og-home.jpg', indexable: true, score: 92 },
    { id: 's2', path: '/c/kinh-can', title: 'Kính cận thời trang - Gọng kính cận đẹp nhất 2026', description: 'Bộ sưu tập kính cận trendy. Tròng kính đa dạng: chống ánh sáng xanh, đổi màu, UV. Giá từ 350k.', ogImage: '/og-kincan.jpg', indexable: true, score: 88 },
    { id: 's3', path: '/c/kinh-ram', title: 'Kính râm chính hãng - Aviator, Wayfarer, Cat Eye', description: 'Kính râm nam nữ đa dạng kiểu dáng. Chống UV 400, phân cực. Ray-Ban, Oakley, Tom Ford.', ogImage: '/og-kinram.jpg', indexable: true, score: 85 },
    { id: 's4', path: '/track', title: 'Tra cứu vận đơn - Siêu Thị Mắt Kính', description: 'Nhập mã vận đơn để theo dõi tình trạng giao hàng. Hỗ trợ GHN, GHTK, Viettel Post, J&T.', ogImage: '', indexable: true, score: 70 },
    { id: 's5', path: '/partner', title: 'Đăng ký đại lý / Affiliate - Siêu Thị Mắt Kính', description: 'Tham gia chương trình đại lý/affiliate. Hoa hồng lên tới 15%. Hỗ trợ marketing, đào tạo.', ogImage: '/og-partner.jpg', indexable: true, score: 78 },
];

const CWV_DATA = [
    { metric: 'LCP', label: 'Largest Contentful Paint', value: '1.8s', target: '< 2.5s', status: 'good' },
    { metric: 'FID', label: 'First Input Delay', value: '45ms', target: '< 100ms', status: 'good' },
    { metric: 'CLS', label: 'Cumulative Layout Shift', value: '0.08', target: '< 0.1', status: 'good' },
    { metric: 'TTFB', label: 'Time to First Byte', value: '320ms', target: '< 800ms', status: 'good' },
    { metric: 'INP', label: 'Interaction to Next Paint', value: '180ms', target: '< 200ms', status: 'warn' },
];

function ScoreBadge({ score }: { score: number }) {
    const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{ width: 50, height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color }}>{score}</span>
        </div>
    );
}

export default function AdminSeoPage() {
    const [pages, setPages] = useState(DEMO_PAGES);
    const [toast, setToast] = useState<string | null>(null);
    const [aiSeo, setAiSeo] = useState<Record<string, { metaTitle: string; metaDescription: string; keywords: string[]; h1Suggestion: string }>>({});
    const [aiSeoLoading, setAiSeoLoading] = useState<string | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const toggleIndex = (id: string) => {
        setPages(prev => prev.map(p => p.id === id ? { ...p, indexable: !p.indexable } : p));
        showToast('🔄 Đã cập nhật indexing');
    };

    const avgScore = Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length);

    return (
        <div className="animate-in">
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>🔍 SEO & Performance</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
                Quản lý meta tags, sitemap, robots, và Core Web Vitals
            </p>

            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 999,
                    padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    fontSize: 'var(--text-sm)', fontWeight: 600, animation: 'fadeIn 200ms ease',
                }}>{toast}</div>
            )}

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                {[
                    { label: 'SEO Score TB', value: avgScore, suffix: '/100', color: avgScore >= 80 ? '#22c55e' : '#f59e0b' },
                    { label: 'Trang indexed', value: pages.filter(p => p.indexable).length, suffix: `/${pages.length}`, color: 'var(--text-primary)' },
                    { label: 'Sitemap', value: '✅', suffix: 'Auto-gen', color: '#22c55e' },
                    { label: 'Robots.txt', value: '✅', suffix: 'Configured', color: '#22c55e' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-card__label">{s.label}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span className="stat-card__value" style={{ color: s.color }}>{s.value}</span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.suffix}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Core Web Vitals */}
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>⚡ Core Web Vitals</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                {CWV_DATA.map(cwv => (
                    <div key={cwv.metric} className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{cwv.label}</div>
                        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: cwv.status === 'good' ? '#22c55e' : '#f59e0b' }}>{cwv.value}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>Target: {cwv.target}</div>
                    </div>
                ))}
            </div>

            {/* Page SEO Table */}
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>📄 Meta Tags theo trang</h2>
            <div className="card" style={{ overflow: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Đường dẫn</th>
                            <th>Title</th>
                            <th>Description</th>
                            <th>OG Image</th>
                            <th>Index</th>
                            <th>Score</th>
                            <th>AI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pages.map(p => (
                            <tr key={p.id}>
                                <td><code style={{ fontSize: 'var(--text-xs)', color: 'var(--gold-400)' }}>{p.path}</code></td>
                                <td style={{ fontSize: 'var(--text-xs)', maxWidth: 200 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.title}</div>
                                    <span style={{ color: p.title.length <= 60 ? '#22c55e' : '#f59e0b', fontSize: 'var(--text-xs)' }}>
                                        {p.title.length}/60 ký tự
                                    </span>
                                </td>
                                <td style={{ fontSize: 'var(--text-xs)', maxWidth: 200, color: 'var(--text-tertiary)' }}>
                                    {p.description.slice(0, 80)}...
                                    <div style={{ color: p.description.length <= 160 ? '#22c55e' : '#f59e0b', marginTop: 2 }}>
                                        {p.description.length}/160 ký tự
                                    </div>
                                </td>
                                <td>{p.ogImage ? '🖼️ Có' : <span style={{ color: 'var(--warning)' }}>⚠️ Thiếu</span>}</td>
                                <td>
                                    <button onClick={() => toggleIndex(p.id)} style={{
                                        background: p.indexable ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: p.indexable ? '#22c55e' : '#ef4444',
                                        border: 'none', borderRadius: 'var(--radius-sm)',
                                        padding: '4px 10px', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer',
                                    }}>
                                        {p.indexable ? '✅ Index' : '🚫 Noindex'}
                                    </button>
                                </td>
                                <td><ScoreBadge score={p.score} /></td>
                                <td>
                                    <button className="btn btn-sm" disabled={aiSeoLoading === p.id} onClick={async () => {
                                        setAiSeoLoading(p.id);
                                        try {
                                            const res = await fetch('/api/smk/ai/seo-writer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productName: p.title.split(' - ')[0], description: p.description, category: p.path }) });
                                            const data = await res.json();
                                            setAiSeo(prev => ({ ...prev, [p.id]: data }));
                                        } catch { showToast('⚠️ Lỗi AI'); }
                                        setAiSeoLoading(null);
                                    }} style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: 'none', fontSize: 10, fontWeight: 600 }}>
                                        {aiSeoLoading === p.id ? '⏳' : '✍️ AI'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* AI SEO Results */}
            {Object.keys(aiSeo).length > 0 && (
                <div className="card" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-3)', border: '1px solid rgba(168,85,247,0.3)' }}>
                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#a855f7', marginBottom: 'var(--space-3)' }}>🤖 AI SEO Gợi ý</h3>
                    {Object.entries(aiSeo).map(([id, seo]) => {
                        const pg = pages.find(p => p.id === id);
                        return (
                            <div key={id} style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{pg?.path}</div>
                                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 4 }}>{seo.metaTitle}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{seo.metaDescription}</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {seo.keywords.map((k: string) => <span key={k} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>{k}</span>)}
                                </div>
                                <button className="btn btn-sm" style={{ marginTop: 8, fontSize: 10 }} onClick={() => {
                                    setPages(prev => prev.map(p => p.id === id ? { ...p, title: seo.metaTitle, description: seo.metaDescription, score: Math.min(p.score + 5, 100) } : p));
                                    showToast('✅ Đã áp dụng!');
                                }}>✅ Áp dụng</button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tips */}
            <div className="card" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 24 }}>💡</span>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>Checklist SEO:</strong><br />
                    • Title ≤ 60 ký tự, chứa keyword chính<br />
                    • Description 120-160 ký tự, có CTA<br />
                    • Mỗi trang có OG Image 1200×630<br />
                    • Structured data JSON-LD cho sản phẩm (Product, Offer, Review)<br />
                    • Sitemap tự động cập nhật khi thêm/sửa sản phẩm
                </div>
            </div>

            {/* A6: AI SEO Audit */}
            <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>🤖 AI SEO Audit</h3>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', fontWeight: 600 }} onClick={() => {
                    const audit = document.getElementById('seo-audit-result');
                    if (audit) { audit.style.display = audit.style.display === 'none' ? 'block' : 'none'; return; }
                    const results = pages.map(p => {
                        const issues: string[] = [];
                        if (p.title.length > 60) issues.push(`Title quá dài (${p.title.length}/60 ký tự)`);
                        if (p.title.length < 20) issues.push('Title quá ngắn');
                        if (p.description.length > 160) issues.push(`Description quá dài (${p.description.length}/160)`);
                        if (p.description.length < 80) issues.push('Description quá ngắn');
                        if (!p.ogImage) issues.push('Thiếu OG Image');
                        if (!p.indexable) issues.push('Không được index');
                        if (p.score < 60) issues.push(`Điểm SEO thấp: ${p.score}/100`);
                        return { path: p.path, score: p.score, issues };
                    });
                    const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
                    const withIssues = results.filter(r => r.issues.length > 0);
                    const el = document.createElement('div');
                    el.id = 'seo-audit-result';
                    el.style.cssText = 'margin-top:12px';
                    el.innerHTML = `
                        <div style="padding:16px;background:rgba(168,85,247,0.04);border:1px solid rgba(168,85,247,0.2);border-radius:12px">
                            <div style="font-size:14px;font-weight:800;color:#a855f7;margin-bottom:12px">📋 Kết quả Audit SEO</div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;text-align:center">
                                <div style="padding:8px;background:var(--bg-tertiary);border-radius:8px">
                                    <div style="font-size:20px;font-weight:800;color:${avgScore >= 70 ? '#22c55e' : '#f59e0b'}">${avgScore}</div>
                                    <div style="font-size:10px;color:var(--text-muted)">Điểm TB</div>
                                </div>
                                <div style="padding:8px;background:var(--bg-tertiary);border-radius:8px">
                                    <div style="font-size:20px;font-weight:800;color:#22c55e">${results.length - withIssues.length}</div>
                                    <div style="font-size:10px;color:var(--text-muted)">Đạt chuẩn</div>
                                </div>
                                <div style="padding:8px;background:var(--bg-tertiary);border-radius:8px">
                                    <div style="font-size:20px;font-weight:800;color:#ef4444">${withIssues.length}</div>
                                    <div style="font-size:10px;color:var(--text-muted)">Cần sửa</div>
                                </div>
                            </div>
                            ${withIssues.length > 0 ? `
                                <div style="font-size:12px;font-weight:700;margin-bottom:8px">⚠️ Trang cần cải thiện:</div>
                                ${withIssues.map(r => `
                                    <div style="padding:8px;margin-bottom:6px;background:var(--bg-tertiary);border-radius:6px;font-size:11px">
                                        <div style="font-weight:600;color:var(--text-primary)">${r.path} <span style="color:${r.score >= 70 ? '#22c55e' : '#ef4444'}">(${r.score}/100)</span></div>
                                        <ul style="margin:4px 0 0;padding-left:16px;color:var(--text-muted);line-height:1.5">
                                            ${r.issues.map(i => `<li>${i}</li>`).join('')}
                                        </ul>
                                    </div>
                                `).join('')}
                            ` : '<div style="font-size:12px;color:#22c55e;font-weight:600">✅ Tất cả trang đều đạt chuẩn SEO!</div>'}
                            <div style="margin-top:12px;padding:10px;background:rgba(34,197,94,0.06);border-radius:8px;border:1px solid rgba(34,197,94,0.15)">
                                <div style="font-size:11px;font-weight:700;color:#22c55e;margin-bottom:4px">💡 Đề xuất</div>
                                <ul style="font-size:11px;color:var(--text-secondary);padding-left:16px;line-height:1.6;margin:0">
                                    <li>Thêm OG Image 1200×630 cho trang còn thiếu</li>
                                    <li>Title nên chứa keyword chính + brand "SMK"</li>
                                    <li>Thêm Structured Data JSON-LD cho trang sản phẩm</li>
                                    <li>Tạo sitemap.xml tự động cập nhật</li>
                                </ul>
                            </div>
                        </div>
                    `;
                    document.getElementById('seo-audit-container')?.appendChild(el);
                }}>
                    🤖 Chạy AI Audit toàn bộ
                </button>
                <div id="seo-audit-container" />
            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
