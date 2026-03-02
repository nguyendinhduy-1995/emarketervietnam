'use client';
import { useState } from 'react';

const SAMPLE_DIGITAL = [
    { id: 'dp-1', name: 'Khóa học Marketing số', type: 'course', price: 990000, status: 'active', sold: 42 },
    { id: 'dp-2', name: 'Mẫu trang đích chuyên nghiệp', type: 'template', price: 490000, status: 'active', sold: 128 },
    { id: 'dp-3', name: 'Bộ công cụ tiếp thị nội dung', type: 'toolkit', price: 1290000, status: 'draft', sold: 0 },
    { id: 'dp-4', name: 'Sách điện tử: Chiến lược SEO 2026', type: 'ebook', price: 199000, status: 'active', sold: 67 },
];

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    course: { label: 'Khóa học', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    template: { label: 'Mẫu', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    toolkit: { label: 'Bộ công cụ', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    ebook: { label: 'Sách điện tử', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active: { label: 'Đang bán', color: '#059669' },
    draft: { label: 'Nháp', color: '#9ca3af' },
    archived: { label: 'Lưu trữ', color: '#ef4444' },
};

export default function DigitalProductsPage() {
    const [filter, setFilter] = useState('all');

    const filtered = filter === 'all' ? SAMPLE_DIGITAL : SAMPLE_DIGITAL.filter(p => p.status === filter);
    const totalRevenue = SAMPLE_DIGITAL.filter(p => p.status === 'active').reduce((sum, p) => sum + p.price * p.sold, 0);

    return (
        <div style={{ padding: '32px 40px', maxWidth: '1200px' }}>
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    📦 Sản phẩm số
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Quản lý khóa học, mẫu thiết kế, sách điện tử, bộ công cụ và các sản phẩm số khác
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Tổng sản phẩm</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)' }}>{SAMPLE_DIGITAL.length}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Đang bán</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669' }}>{SAMPLE_DIGITAL.filter(p => p.status === 'active').length}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Tổng đã bán</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#d97706' }}>{SAMPLE_DIGITAL.reduce((s, p) => s + p.sold, 0)}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Doanh thu</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#ec4899' }}>{(totalRevenue / 1000000).toFixed(1)}tr</div>
                </div>
            </div>

            {/* Filter + Add */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ k: 'all', l: 'Tất cả' }, { k: 'active', l: 'Đang bán' }, { k: 'draft', l: 'Nháp' }].map(f => (
                        <button key={f.k} onClick={() => setFilter(f.k)} style={{
                            padding: '7px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            background: filter === f.k ? 'var(--accent-primary)' : 'var(--bg-card)',
                            color: filter === f.k ? 'white' : 'var(--text-secondary)',
                        }}>{f.l}</button>
                    ))}
                </div>
                <button style={{
                    padding: '9px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white',
                }}>+ Thêm sản phẩm số</button>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Tên sản phẩm', 'Loại', 'Giá', 'Đã bán', 'Trạng thái', ''].map(h => (
                                <th key={h} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(p => {
                            const t = TYPE_LABELS[p.type] || TYPE_LABELS.course;
                            const s = STATUS_LABELS[p.status] || STATUS_LABELS.draft;
                            return (
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: t.color, background: t.bg, padding: '3px 10px', borderRadius: '8px' }}>{t.label}</span>
                                    </td>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.price.toLocaleString('vi-VN')}đ</td>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>{p.sold}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: s.color }}>{s.label}</span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                        <button style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>Chi tiết</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
                        <p style={{ fontWeight: 600 }}>Chưa có sản phẩm số nào</p>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>Tạo sản phẩm số đầu tiên để bắt đầu bán</p>
                    </div>
                )}
            </div>
        </div>
    );
}
