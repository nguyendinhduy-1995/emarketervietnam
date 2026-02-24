'use client';
import { useEffect, useState, useCallback } from 'react';

interface HelpDoc {
    id: string;
    title: string;
    slug: string;
    moduleKey: string | null;
    contentMd: string;
    sortOrder: number;
}

const MODULES: Record<string, { label: string; icon: string; color: string }> = {
    'getting-started': { label: 'Bắt đầu', icon: '🚀', color: '#6366f1' },
    'wallet': { label: 'Ví', icon: '💰', color: '#22c55e' },
    'marketplace': { label: 'Sản phẩm', icon: '🛒', color: '#3b82f6' },
    'account': { label: 'Tài khoản', icon: '👤', color: '#8b5cf6' },
    'faq': { label: 'FAQ', icon: '❓', color: '#f59e0b' },
};

export default function HelpCenterPage() {
    const [docs, setDocs] = useState<HelpDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeModule, setActiveModule] = useState('');
    const [openDoc, setOpenDoc] = useState<string | null>(null);

    const loadDocs = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (activeModule) params.set('module', activeModule);
        fetch(`/api/hub/help?${params}`)
            .then(r => r.json())
            .then(d => { setDocs(d.docs || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [search, activeModule]);

    useEffect(() => { loadDocs(); }, [loadDocs]);

    const renderMd = (md: string) => {
        // Simple markdown to HTML
        return md
            .replace(/^### (.+)$/gm, '<h4 style="font-size:15px;font-weight:700;margin:16px 0 8px;color:var(--text-primary)">$1</h4>')
            .replace(/^## (.+)$/gm, '<h3 style="font-size:17px;font-weight:800;margin:20px 0 10px;color:var(--text-primary)">$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\d+\. (.+)$/gm, '<div style="padding:4px 0 4px 16px;position:relative"><span style="position:absolute;left:0;color:var(--accent-primary);font-weight:700">•</span>$1</div>')
            .replace(/^- (.+)$/gm, '<div style="padding:3px 0 3px 16px;position:relative"><span style="position:absolute;left:0;color:var(--text-muted)">·</span>$1</div>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📚</div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Trung tâm trợ giúp</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Hướng dẫn sử dụng eMarketer Hub</p>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm kiếm bài viết..."
                    style={{
                        width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px', fontSize: '15px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                        fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Module filter chips */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button onClick={() => setActiveModule('')} style={{
                    padding: '8px 16px', borderRadius: '20px', border: activeModule === '' ? 'none' : '1px solid var(--border)',
                    background: activeModule === '' ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: activeModule === '' ? 'white' : 'var(--text-secondary)',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}>Tất cả</button>
                {Object.entries(MODULES).map(([key, mod]) => (
                    <button key={key} onClick={() => setActiveModule(activeModule === key ? '' : key)} style={{
                        padding: '8px 16px', borderRadius: '20px', border: activeModule === key ? 'none' : '1px solid var(--border)',
                        background: activeModule === key ? mod.color : 'var(--bg-card)',
                        color: activeModule === key ? 'white' : 'var(--text-secondary)',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                        <span>{mod.icon}</span> {mod.label}
                    </button>
                ))}
            </div>

            {/* Results */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: '70px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'helpPulse 1.5s ease-in-out infinite' }} />)}
                    <style>{`@keyframes helpPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
                </div>
            ) : docs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Không tìm thấy bài viết</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Thử tìm từ khóa khác hoặc xóa bộ lọc</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {docs.map(doc => {
                        const mod = MODULES[doc.moduleKey || ''];
                        const isOpen = openDoc === doc.id;
                        return (
                            <div key={doc.id} style={{
                                borderRadius: '14px', background: 'var(--bg-card)', border: `1px solid ${isOpen ? (mod?.color || 'var(--accent-primary)') + '40' : 'var(--border)'}`,
                                overflow: 'hidden', transition: 'border-color 200ms',
                            }}>
                                {/* Clickable header */}
                                <button onClick={() => setOpenDoc(isOpen ? null : doc.id)} style={{
                                    width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer',
                                    padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'inherit',
                                }}>
                                    {mod && (
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                                            background: `${mod.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '18px',
                                        }}>{mod.icon}</div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{doc.title}</div>
                                        {mod && <div style={{ fontSize: '12px', color: mod.color, fontWeight: 600, marginTop: '2px' }}>{mod.label}</div>}
                                    </div>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0 }}>
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>

                                {/* Expandable content */}
                                <div style={{
                                    maxHeight: isOpen ? '2000px' : '0', overflow: 'hidden',
                                    transition: 'max-height 400ms ease',
                                }}>
                                    <div style={{
                                        padding: '0 16px 16px', fontSize: '14px', lineHeight: 1.8,
                                        color: 'var(--text-secondary)', borderTop: '1px solid var(--border)',
                                    }}
                                        dangerouslySetInnerHTML={{ __html: renderMd(doc.contentMd) }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Contact helpline */}
            <div style={{
                padding: '20px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center',
            }}>
                <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 6px' }}>Cần thêm hỗ trợ?</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 12px' }}>
                    Nhắn tin qua AI Trợ lý hoặc liên hệ hotline
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="tel:0901234567" style={{
                        padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                        background: 'var(--accent-primary)', color: 'white', textDecoration: 'none',
                    }}>📞 Gọi Hotline</a>
                    <a href="mailto:support@emarketervietnam.vn" style={{
                        padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                        background: 'var(--bg-card)', color: 'var(--accent-primary)', textDecoration: 'none', border: '1px solid var(--accent-primary)',
                    }}>✉ Email</a>
                </div>
            </div>
        </div>
    );
}
