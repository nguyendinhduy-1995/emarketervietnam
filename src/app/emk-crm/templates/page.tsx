'use client';
import { useEffect, useState, useCallback } from 'react';

interface Template {
    id: string; name: string; subject: string; body: string;
    category: string; isActive?: boolean; isDefault?: boolean;
    author?: { name: string } | null;
}

const CATEGORIES = ['ALL', 'WELCOME', 'FOLLOW_UP', 'RENEWAL', 'PROMO', 'GENERAL'];
const CAT_VN: Record<string, string> = {
    ALL: 'Tất cả', WELCOME: 'Chào mừng', FOLLOW_UP: 'Theo dõi', RENEWAL: 'Gia hạn', PROMO: 'Khuyến mãi', GENERAL: 'Chung',
};
const CAT_ICONS: Record<string, string> = {
    WELCOME: '🎉', FOLLOW_UP: '🔄', RENEWAL: '♻️', PROMO: '🎯', GENERAL: '📋',
};
const CAT_COLORS: Record<string, string> = {
    WELCOME: '#22c55e', FOLLOW_UP: '#f59e0b', RENEWAL: '#3b82f6', PROMO: '#8b5cf6', GENERAL: '#6b7280',
};

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [preview, setPreview] = useState<Template | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', subject: '', body: '', category: 'GENERAL' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        const url = filter !== 'ALL' ? `/api/emk-crm/templates?category=${filter}` : '/api/emk-crm/templates';
        fetch(url).then(r => r.json())
            .then(d => { setTemplates(d.templates || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [filter]);
    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!form.name || !form.subject) return;
        setSaving(true);
        await fetch('/api/emk-crm/templates', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        setSaving(false); setShowForm(false);
        setForm({ name: '', subject: '', body: '', category: 'GENERAL' });
        load();
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/emk-crm/templates?id=${id}`, { method: 'DELETE' });
        load();
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', borderRadius: '10px',
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✉️ Mẫu email & tin nhắn
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        {templates.length} mẫu — sử dụng khi liên hệ khách hàng
                    </p>
                </div>
                <button onClick={() => setShowForm(!showForm)} style={{
                    padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                    background: showForm ? 'var(--bg-input)' : 'var(--accent-gradient)',
                    border: showForm ? '1px solid var(--border)' : 'none',
                    color: showForm ? 'var(--text-primary)' : 'white',
                    cursor: 'pointer', fontFamily: 'inherit',
                }}>
                    {showForm ? 'Huỷ' : '+ Tạo mẫu mới'}
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <div style={{
                    padding: '16px', borderRadius: '16px',
                    background: 'var(--bg-card)', border: '2px solid var(--accent-primary)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tên mẫu</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="VD: Chào khách hàng VIP" />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phân loại</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                                {CATEGORIES.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{CAT_ICONS[c]} {CAT_VN[c]}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tiêu đề</label>
                        <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} style={inputStyle} placeholder="VD: Chào mừng {{name}} 🎉" />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Nội dung <span style={{ fontWeight: 400 }}>(Dùng {"{{name}}"}, {"{{industry}}"} cho biến)</span>
                        </label>
                        <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                            rows={6} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Nội dung mẫu..." />
                    </div>
                    <button onClick={handleCreate} disabled={saving || !form.name || !form.subject} style={{
                        padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
                        background: 'var(--accent-gradient)', border: 'none', color: 'white',
                        cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
                        opacity: saving || !form.name || !form.subject ? 0.5 : 1,
                    }}>
                        {saving ? 'Đang tạo…' : '✨ Tạo mẫu'}
                    </button>
                </div>
            )}

            {/* Category filter */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setFilter(c)} style={{
                        padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                        background: filter === c ? (c === 'ALL' ? 'var(--accent-primary)' : `${CAT_COLORS[c]}15`) : 'var(--bg-card)',
                        color: filter === c ? (c === 'ALL' ? 'white' : CAT_COLORS[c]) : 'var(--text-muted)',
                        border: `1px solid ${filter === c ? (c === 'ALL' ? 'var(--accent-primary)' : CAT_COLORS[c] + '30') : 'var(--border)'}`,
                        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}>
                        {c !== 'ALL' && CAT_ICONS[c]} {CAT_VN[c]}
                    </button>
                ))}
            </div>

            {/* Templates list */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: '90px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'tplPulse 1.5s ease-in-out infinite' }} />)}
                    <style>{`@keyframes tplPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
                </div>
            ) : templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✉️</div>
                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Chưa có mẫu nào</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Tạo mẫu email đầu tiên</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {templates.map(tpl => {
                        const color = CAT_COLORS[tpl.category] || '#6b7280';
                        return (
                            <div key={tpl.id} style={{
                                padding: '14px 16px', borderRadius: '14px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                borderLeft: `3px solid ${color}`,
                                cursor: 'pointer', transition: 'all 150ms ease',
                            }} onClick={() => setPreview(preview?.id === tpl.id ? null : tpl)}>
                                {/* Row 1: Name + Category */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>{CAT_ICONS[tpl.category] || '📋'}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{tpl.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tpl.subject}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                            background: `${color}15`, color,
                                        }}>{CAT_VN[tpl.category]}</span>
                                        {tpl.isDefault && (
                                            <span style={{
                                                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                                background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)',
                                            }}>Mặc định</span>
                                        )}
                                    </div>
                                </div>

                                {/* Preview panel */}
                                {preview?.id === tpl.id && (
                                    <div style={{
                                        marginTop: '10px', padding: '12px', borderRadius: '10px',
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Xem trước:</div>
                                        <pre style={{
                                            fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                            color: 'var(--text-primary)', margin: 0, fontFamily: 'inherit',
                                        }}>{tpl.body}</pre>
                                        {!tpl.isDefault && (
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleDelete(tpl.id)} style={{
                                                    padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                                    background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444',
                                                    cursor: 'pointer', fontFamily: 'inherit',
                                                }}>🗑 Xoá</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
