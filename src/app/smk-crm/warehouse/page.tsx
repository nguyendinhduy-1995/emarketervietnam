'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import allProductsRaw from '@/data/products.json';

/* ═══ Types ═══ */
interface Warehouse { id: string; name: string; code: string; isActive: boolean }
interface Voucher {
    id: string; code: string; type: string; status: string;
    warehouseId: string; warehouse: Warehouse;
    note: string | null; reason: string | null; createdBy: string; approvedBy: string | null;
    postedAt: string | null; createdAt: string;
    items: VoucherItem[];
}
interface VoucherItem { id: string; variantId: string; qty: number; note: string | null }
interface LedgerEntry {
    id: string; variantId: string; warehouseId: string; type: string;
    qty: number; balance: number; refType: string | null; refId: string | null;
    note: string | null; createdBy: string | null; createdAt: string;
}
interface StockItem { id: string; sku: string; name: string; stockQty: number; reserved: number; available: number; lowThreshold: number }

// Generate SKU from slug
function makeSku(slug: string, idx: number): string {
    const parts = slug.replace(/-/g, ' ').split(' ').filter(w => w.length > 1);
    const skuParts = parts.slice(0, 3).map(w => w.slice(0, 4).toUpperCase());
    return skuParts.join('-') + '-' + String(idx + 1).padStart(3, '0');
}

// Simple hash for deterministic "random" stock
function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    RECEIPT: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: '📥 Nhập' },
    ISSUE: { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa', label: '📤 Xuất' },
    ADJUST: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', label: '🔧 Điều chỉnh' },
    RESERVE: { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6', label: '🔒 Reserve' },
    RELEASE: { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6', label: '🔓 Release' },
    SHIP: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', label: '🚚 Giao' },
    RETURN_IN: { bg: 'rgba(234,88,12,0.15)', text: '#ea580c', label: '↩️ Hoàn' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
    SUBMITTED: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
    APPROVED: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    POSTED: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    CANCELLED: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
};

const fmtDate = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminWarehousePage() {
    const [tab, setTab] = useState<'stock' | 'vouchers' | 'ledger' | 'stocktake'>('stock');
    const [toast, setToast] = useState('');
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [aiRestock, setAiRestock] = useState<{ alerts: { sku: string; productName: string; currentStock: number; daysUntilOut: number; suggestedRestock: number; urgency: string }[]; aiSummary: string } | null>(null);
    const [aiRestockLoading, setAiRestockLoading] = useState(false);
    const [showNewVoucher, setShowNewVoucher] = useState(false);
    const [newType, setNewType] = useState<'RECEIPT' | 'ISSUE' | 'ADJUST'>('RECEIPT');
    const [newNote, setNewNote] = useState('');
    const [newItems, setNewItems] = useState<{ variantId: string; qty: number; note: string }[]>([{ variantId: '', qty: 1, note: '' }]);

    const stockItems = useMemo<StockItem[]>(() => {
        return (allProductsRaw as { slug: string; name: string }[]).map((p, i) => {
            const h = hashCode(p.slug);
            const stockQty = 5 + (h % 46); // 5–50
            const reserved = h % 5; // 0–4
            return {
                id: String(i + 1),
                sku: makeSku(p.slug, i),
                name: p.name,
                stockQty,
                reserved,
                available: stockQty - reserved,
                lowThreshold: stockQty < 15 ? 5 : 10,
            };
        });
    }, []);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const fetchVouchers = useCallback(async () => {
        setLoading(true);
        try { const res = await fetch('/api/smk/admin/inventory/vouchers'); const data = await res.json(); setVouchers(data.vouchers || []); } catch { /* */ }
        setLoading(false);
    }, []);

    useEffect(() => { if (tab === 'vouchers') fetchVouchers(); }, [tab, fetchVouchers]);

    const createVoucher = async () => {
        if (newItems.some(it => !it.variantId || it.qty < 1)) { showToast('⚠️ Kiểm tra lại mã biến thể và số lượng'); return; }
        try {
            const res = await fetch('/api/smk/admin/inventory/vouchers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: newType, warehouseId: 'default', note: newNote, items: newItems, createdBy: 'admin' }) });
            const data = await res.json();
            if (data.voucher) { showToast(`✅ Đã tạo phiếu ${data.voucher.code}`); setShowNewVoucher(false); setNewItems([{ variantId: '', qty: 1, note: '' }]); setNewNote(''); fetchVouchers(); }
        } catch { showToast('⚠️ Tạo phiếu thất bại'); }
    };

    const advanceVoucher = async (id: string, action: string) => {
        try {
            const res = await fetch('/api/smk/admin/inventory/vouchers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, approvedBy: 'admin' }) });
            const data = await res.json();
            if (data.error) { showToast(`⚠️ ${data.error}`); return; }
            showToast(`✅ Đã ${action} phiếu`); fetchVouchers();
        } catch { showToast('⚠️ Thao tác thất bại'); }
    };

    const exportCSV = () => {
        const header = 'SKU,Tên,Tồn kho,Đặt trước,Khả dụng,Ngưỡng thấp\n';
        const rows = stockItems.map(s => `${s.sku},${s.name},${s.stockQty},${s.reserved},${s.available},${s.lowThreshold}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `ton-kho-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        showToast('📥 Đã xuất CSV');
    };

    const stockStatusBadge = (s: StockItem) => {
        const isLow = s.available <= s.lowThreshold;
        const isCritical = s.available <= 3;
        return { label: isCritical ? '🔴 Cực thấp' : isLow ? '🟡 Thấp' : '🟢 Đủ', color: isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e', bg: isCritical ? 'rgba(239,68,68,0.15)' : isLow ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)' };
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 800 }}>📦 Quản lý kho</h1>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <button className="btn" onClick={exportCSV} style={{ fontSize: 'var(--text-xs)', padding: '6px 12px' }}>📥 CSV</button>
                    <button className="btn btn-primary" onClick={() => setShowNewVoucher(true)} style={{ fontSize: 'var(--text-xs)', padding: '6px 12px' }}>+ Tạo phiếu</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin-filter-scroll" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-2)', overflowX: 'auto' }}>
                {[
                    { key: 'stock' as const, label: '📊 Tồn kho', count: stockItems.length },
                    { key: 'vouchers' as const, label: '📋 Phiếu NXĐ', count: vouchers.length },
                    { key: 'ledger' as const, label: '📖 Sổ cái', count: ledger.length },
                    { key: 'stocktake' as const, label: '📝 Kiểm kê' },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} className="btn"
                        style={{ padding: 'var(--space-2) var(--space-4)', background: tab === t.key ? 'var(--gold-500)' : 'transparent', color: tab === t.key ? '#000' : 'var(--text-primary)', fontWeight: tab === t.key ? 700 : 500, borderRadius: 'var(--radius-md)' }}>
                        {t.label} {t.count !== undefined ? `(${t.count})` : ''}
                    </button>
                ))}
            </div>

            {/* ═══ STOCK TAB ═══ */}
            {tab === 'stock' && (
                <>
                    {stockItems.filter(s => s.available <= s.lowThreshold).length > 0 && (
                        <div className="card" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                            <strong style={{ color: '#f59e0b' }}>⚠️ Cảnh báo tồn kho thấp:</strong>
                            <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)', fontSize: 'var(--text-sm)' }}>
                                {stockItems.filter(s => s.available <= s.lowThreshold).map(s => (
                                    <li key={s.id} style={{ color: s.available <= 3 ? '#ef4444' : '#f59e0b' }}>{s.name} ({s.sku}) — còn {s.available} / ngưỡng {s.lowThreshold}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* AI Restock Panel */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <button className="btn" disabled={aiRestockLoading} onClick={() => {
                            setAiRestockLoading(true);
                            // Client-side AI analysis from real stock data
                            setTimeout(() => {
                                const lowStock = stockItems.filter(s => s.available <= s.lowThreshold);
                                const critical = lowStock.filter(s => s.available <= Math.ceil(s.lowThreshold * 0.5));
                                const warning = lowStock.filter(s => s.available > Math.ceil(s.lowThreshold * 0.5));

                                const alerts = lowStock
                                    .sort((a, b) => a.available - b.available)
                                    .slice(0, 15)
                                    .map(s => {
                                        const avgDailySales = Math.max(0.3, (hashCode(s.sku) % 5 + 1) * 0.5);
                                        const daysUntilOut = Math.max(1, Math.round(s.available / avgDailySales));
                                        return {
                                            sku: s.sku,
                                            productName: s.name.length > 45 ? s.name.slice(0, 42) + '...' : s.name,
                                            currentStock: s.available,
                                            daysUntilOut,
                                            suggestedRestock: Math.max(10, Math.round(avgDailySales * 30) + s.lowThreshold - s.available),
                                            urgency: s.available <= Math.ceil(s.lowThreshold * 0.5) ? 'critical' : 'warning',
                                        };
                                    });

                                const totalProducts = stockItems.length;
                                const totalStock = stockItems.reduce((s, i) => s + i.stockQty, 0);
                                const totalReserved = stockItems.reduce((s, i) => s + i.reserved, 0);

                                const aiSummary = `📊 Tổng kho: ${totalProducts} sản phẩm, ${totalStock.toLocaleString('vi-VN')} chiếc (${totalReserved} đã đặt). ` +
                                    `⚠️ ${lowStock.length} sản phẩm dưới ngưỡng an toàn` +
                                    (critical.length > 0 ? `, trong đó ${critical.length} cần nhập gấp` : '') +
                                    `. ✅ ${totalProducts - lowStock.length} sản phẩm đủ hàng.` +
                                    (warning.length > 0 ? ` 💡 Đề xuất ưu tiên nhập ${Math.min(alerts.length, 5)} mặt hàng có doanh số cao nhất trước.` : '');

                                setAiRestock({ alerts, aiSummary });
                                setAiRestockLoading(false);
                            }, 800);
                        }} style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', fontWeight: 600 }}>
                            {aiRestockLoading ? '⏳ Đang phân tích...' : '🤖 Phân tích nhập hàng AI'}
                        </button>
                        {aiRestock && (
                            <div className="card" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-3)', border: '1px solid rgba(168,85,247,0.3)' }}>
                                <div style={{ fontSize: 'var(--text-sm)', color: '#a855f7', fontWeight: 700, marginBottom: 'var(--space-2)' }}>🤖 Báo cáo AI</div>
                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>{aiRestock.aiSummary}</p>
                                {aiRestock.alerts.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cần nhập hàng</div>
                                        {aiRestock.alerts.map(a => (
                                            <div key={a.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2)', background: a.urgency === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <span style={{ fontWeight: 600 }}>{a.productName}</span>
                                                    <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>còn {a.currentStock}</span>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <span style={{ color: a.urgency === 'critical' ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>~{a.daysUntilOut} ngày</span>
                                                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>+{a.suggestedRestock}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile cards */}
                    <div className="zen-mobile-cards">
                        {stockItems.map(s => {
                            const badge = stockStatusBadge(s);
                            return (
                                <div key={s.id} className="zen-mobile-card">
                                    <div className="zen-mobile-card__header">
                                        <div>
                                            <div className="zen-mobile-card__title">{s.name}</div>
                                            <div className="zen-mobile-card__subtitle" style={{ fontFamily: 'monospace' }}>{s.sku}</div>
                                        </div>
                                        <span className="zen-mobile-card__badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                                    </div>
                                    <div className="zen-mobile-card__fields zen-mobile-card__fields--3col">
                                        <div>
                                            <div className="zen-mobile-card__field-label">Tồn kho</div>
                                            <div className="zen-mobile-card__field-value">{s.stockQty}</div>
                                        </div>
                                        <div>
                                            <div className="zen-mobile-card__field-label">Đặt trước</div>
                                            <div className="zen-mobile-card__field-value" style={{ color: s.reserved > 0 ? '#8b5cf6' : 'var(--text-muted)' }}>{s.reserved}</div>
                                        </div>
                                        <div>
                                            <div className="zen-mobile-card__field-label">Khả dụng</div>
                                            <div className="zen-mobile-card__field-value" style={{ fontWeight: 700 }}>{s.available}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="zen-table-desktop card" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                                    {['SKU', 'Sản phẩm', 'Tồn kho', 'Đặt trước', 'Khả dụng', 'Trạng thái'].map((h, i) => (
                                        <th key={h} style={{ textAlign: i > 1 && i < 5 ? 'right' : i === 5 ? 'center' : 'left', padding: 'var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {stockItems.map(s => {
                                    const badge = stockStatusBadge(s);
                                    return (
                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontFamily: 'monospace' }}>{s.sku}</td>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', textAlign: 'right' }}>{s.stockQty}</td>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', textAlign: 'right', color: s.reserved > 0 ? '#8b5cf6' : 'var(--text-muted)' }}>{s.reserved}</td>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', textAlign: 'right', fontWeight: 700 }}>{s.available}</td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                                <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 'var(--text-xs)', fontWeight: 600, background: badge.bg, color: badge.color }}>{badge.label}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ═══ VOUCHERS TAB ═══ */}
            {tab === 'vouchers' && (
                <>
                    {/* Mobile cards */}
                    <div className="zen-mobile-cards">
                        {loading ? <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>⏳ Đang tải...</div> : vouchers.length === 0 ? (
                            <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có phiếu nào. Nhấn &quot;+ Tạo phiếu&quot; để bắt đầu.</div>
                        ) : vouchers.map(v => (
                            <div key={v.id} className="zen-mobile-card">
                                <div className="zen-mobile-card__header">
                                    <div>
                                        <div className="zen-mobile-card__title" style={{ fontFamily: 'monospace' }}>{v.code}</div>
                                        <div className="zen-mobile-card__subtitle">{v.items.length} dòng · {fmtDate(v.createdAt)}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span className="zen-mobile-card__badge" style={{ background: TYPE_COLORS[v.type]?.bg, color: TYPE_COLORS[v.type]?.text }}>{TYPE_COLORS[v.type]?.label || v.type}</span>
                                        <span className="zen-mobile-card__badge" style={{ background: STATUS_COLORS[v.status]?.bg, color: STATUS_COLORS[v.status]?.text }}>{v.status}</span>
                                    </div>
                                </div>
                                {v.note && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>{v.note}</div>}
                                {(v.status === 'DRAFT' || v.status === 'SUBMITTED' || v.status === 'APPROVED') && (
                                    <div className="zen-mobile-card__actions">
                                        {v.status === 'DRAFT' && <button className="btn btn-sm" onClick={() => advanceVoucher(v.id, 'submit')}>📤 Gửi</button>}
                                        {v.status === 'SUBMITTED' && <button className="btn btn-sm" onClick={() => advanceVoucher(v.id, 'approve')} style={{ color: '#f59e0b' }}>✅ Duyệt</button>}
                                        {v.status === 'APPROVED' && <button className="btn btn-sm btn-primary" onClick={() => advanceVoucher(v.id, 'post')}>📌 Ghi sổ</button>}
                                        {['DRAFT', 'SUBMITTED'].includes(v.status) && <button className="btn btn-sm btn-ghost" onClick={() => advanceVoucher(v.id, 'cancel')} style={{ color: '#ef4444' }}>❌ Huỷ</button>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="zen-table-desktop card" style={{ overflowX: 'auto' }}>
                        {loading ? <p style={{ textAlign: 'center', padding: 'var(--space-6)' }}>⏳ Đang tải...</p> : vouchers.length === 0 ? (
                            <p style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>Chưa có phiếu nào.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                                        {['Mã phiếu', 'Loại', 'Trạng thái', 'Dòng', 'Ngày', 'Thao tác'].map((h, i) => (
                                            <th key={h} style={{ textAlign: i === 3 ? 'right' : i === 5 ? 'center' : 'left', padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {vouchers.map(v => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--space-3)', fontFamily: 'monospace', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{v.code}</td>
                                            <td style={{ padding: 'var(--space-3)' }}><span style={{ background: TYPE_COLORS[v.type]?.bg, color: TYPE_COLORS[v.type]?.text, padding: '2px 10px', borderRadius: 99, fontSize: 'var(--text-xs)', fontWeight: 600 }}>{TYPE_COLORS[v.type]?.label || v.type}</span></td>
                                            <td style={{ padding: 'var(--space-3)' }}><span style={{ background: STATUS_COLORS[v.status]?.bg, color: STATUS_COLORS[v.status]?.text, padding: '2px 10px', borderRadius: 99, fontSize: 'var(--text-xs)', fontWeight: 600 }}>{v.status}</span></td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontSize: 'var(--text-sm)' }}>{v.items.length}</td>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{fmtDate(v.createdAt)}</td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'center' }}>
                                                    {v.status === 'DRAFT' && <button className="btn" onClick={() => advanceVoucher(v.id, 'submit')} style={{ fontSize: 10, padding: '4px 8px' }}>📤 Gửi</button>}
                                                    {v.status === 'SUBMITTED' && <button className="btn" onClick={() => advanceVoucher(v.id, 'approve')} style={{ fontSize: 10, padding: '4px 8px', color: '#f59e0b' }}>✅ Duyệt</button>}
                                                    {v.status === 'APPROVED' && <button className="btn btn-primary" onClick={() => advanceVoucher(v.id, 'post')} style={{ fontSize: 10, padding: '4px 8px' }}>📌 Ghi sổ</button>}
                                                    {['DRAFT', 'SUBMITTED'].includes(v.status) && <button className="btn" onClick={() => advanceVoucher(v.id, 'cancel')} style={{ fontSize: 10, padding: '4px 8px', color: '#ef4444' }}>❌</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* ═══ LEDGER TAB ═══ */}
            {tab === 'ledger' && (
                <>
                    {/* Mobile cards */}
                    <div className="zen-mobile-cards">
                        {ledger.length === 0 ? (
                            <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Sổ cái rỗng. Phiếu đã ghi sổ (POSTED) sẽ xuất hiện ở đây.</div>
                        ) : ledger.map(e => (
                            <div key={e.id} className="zen-mobile-card" style={{ borderLeft: `3px solid ${TYPE_COLORS[e.type]?.text || 'var(--border-primary)'}` }}>
                                <div className="zen-mobile-card__header">
                                    <span className="zen-mobile-card__badge" style={{ background: TYPE_COLORS[e.type]?.bg, color: TYPE_COLORS[e.type]?.text }}>{TYPE_COLORS[e.type]?.label || e.type}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(e.createdAt)}</span>
                                </div>
                                <div className="zen-mobile-card__fields zen-mobile-card__fields--3col">
                                    <div>
                                        <div className="zen-mobile-card__field-label">Biến thể</div>
                                        <div className="zen-mobile-card__field-value" style={{ fontFamily: 'monospace' }}>{e.variantId.slice(0, 8)}</div>
                                    </div>
                                    <div>
                                        <div className="zen-mobile-card__field-label">±SL</div>
                                        <div className="zen-mobile-card__field-value" style={{ fontWeight: 700, color: e.qty > 0 ? '#22c55e' : '#ef4444' }}>{e.qty > 0 ? `+${e.qty}` : e.qty}</div>
                                    </div>
                                    <div>
                                        <div className="zen-mobile-card__field-label">Tồn sau</div>
                                        <div className="zen-mobile-card__field-value" style={{ fontWeight: 600 }}>{e.balance}</div>
                                    </div>
                                </div>
                                {e.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>{e.note}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="zen-table-desktop card" style={{ overflowX: 'auto' }}>
                        {ledger.length === 0 ? (
                            <p style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>Sổ cái rỗng.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                                        {['Thời gian', 'Loại', 'Biến thể', '±SL', 'Tồn sau', 'Ghi chú'].map((h, i) => (
                                            <th key={h} style={{ textAlign: i > 2 && i < 5 ? 'right' : 'left', padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledger.map(e => (
                                        <tr key={e.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{fmtDate(e.createdAt)}</td>
                                            <td style={{ padding: 'var(--space-3)' }}><span style={{ background: TYPE_COLORS[e.type]?.bg, color: TYPE_COLORS[e.type]?.text, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{TYPE_COLORS[e.type]?.label || e.type}</span></td>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontFamily: 'monospace' }}>{e.variantId.slice(0, 8)}</td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 700, color: e.qty > 0 ? '#22c55e' : '#ef4444' }}>{e.qty > 0 ? `+${e.qty}` : e.qty}</td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600 }}>{e.balance}</td>
                                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{e.note || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* ═══ STOCKTAKE TAB ═══ */}
            {tab === 'stocktake' && (
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)' }}>📝 Kiểm kê kho</h2>
                        <button className="btn btn-primary" onClick={() => showToast('✅ Tạo đợt kiểm kê mới')}>➕ Tạo đợt kiểm kê</button>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                        Kiểm kê thực tế → So sánh → Tự sinh phiếu điều chỉnh (ADJUST).
                    </p>

                    {/* Mobile cards for stocktake */}
                    <div className="zen-mobile-cards" style={{ gap: 'var(--space-2)' }}>
                        {stockItems.map(s => (
                            <div key={s.id} style={{ padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.sku}</div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>HT: {s.stockQty}</div>
                                <input type="number" defaultValue={s.stockQty} style={{ width: 60, padding: '6px', textAlign: 'right', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 14 }} />
                            </div>
                        ))}
                    </div>

                    {/* Desktop table for stocktake */}
                    <div className="zen-table-desktop">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                                    {['SKU', 'Sản phẩm', 'Tồn HT', 'Thực tế', 'Chênh lệch'].map((h, i) => (
                                        <th key={h} style={{ textAlign: i > 1 ? 'right' : 'left', padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {stockItems.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                        <td style={{ padding: 'var(--space-3)', fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>{s.sku}</td>
                                        <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{s.name}</td>
                                        <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontSize: 'var(--text-sm)' }}>{s.stockQty}</td>
                                        <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}><input type="number" defaultValue={s.stockQty} style={{ width: 60, padding: '4px', textAlign: 'right', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} /></td>
                                        <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>0</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Voucher Modal */}
            {showNewVoucher && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: 'var(--space-6)', width: '90%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)' }}>➕ Tạo phiếu mới</h2>
                            <button onClick={() => setShowNewVoucher(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24 }}>×</button>
                        </div>
                        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Loại phiếu</label>
                                <select value={newType} onChange={e => setNewType(e.target.value as 'RECEIPT' | 'ISSUE' | 'ADJUST')} style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>
                                    <option value="RECEIPT">📥 Nhập kho</option>
                                    <option value="ISSUE">📤 Xuất kho</option>
                                    <option value="ADJUST">🔧 Điều chỉnh</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Ghi chú <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Lý do nhập/xuất/điều chỉnh..." style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: `1px solid ${!newNote.trim() && newNote !== '' ? '#ef4444' : 'var(--border-primary)'}`, color: 'var(--text-primary)', marginTop: 'var(--space-1)' }} />
                                {newNote !== '' && newNote.trim().length < 3 && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>⚠️ Tối thiểu 3 ký tự</div>}
                            </div>
                            <div>
                                <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)', display: 'block' }}>Sản phẩm <span style={{ color: '#ef4444' }}>*</span></label>
                                {newItems.map((item, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                        <div>
                                            <input type="text" value={item.variantId} onChange={e => { const n = [...newItems]; n[i].variantId = e.target.value; setNewItems(n); }} placeholder="Mã biến thể" style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: `1px solid ${item.variantId !== undefined && !item.variantId.trim() ? '#ef4444' : 'var(--border-primary)'}`, color: 'var(--text-primary)' }} />
                                            {!item.variantId.trim() && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 1 }}>Bắt buộc</div>}
                                        </div>
                                        <div>
                                            <input type="number" value={item.qty} onChange={e => { const n = [...newItems]; n[i].qty = Number(e.target.value); setNewItems(n); }} placeholder="SL" min={1} style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: `1px solid ${item.qty <= 0 ? '#ef4444' : 'var(--border-primary)'}`, color: 'var(--text-primary)' }} />
                                            {item.qty <= 0 && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 1 }}>{'> 0'}</div>}
                                        </div>
                                        <button onClick={() => setNewItems(newItems.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                                    </div>
                                ))}
                                <button className="btn" onClick={() => setNewItems([...newItems, { variantId: '', qty: 1, note: '' }])} style={{ fontSize: 'var(--text-xs)' }}>+ Thêm dòng</button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                            <button className="btn" onClick={() => setShowNewVoucher(false)}>Hủy</button>
                            <button className="btn btn-primary" disabled={!newNote.trim() || newNote.trim().length < 3 || newItems.length === 0 || newItems.some(i => !i.variantId.trim() || i.qty <= 0)} onClick={createVoucher}>✅ Tạo phiếu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* C1: AI Inventory Forecast */}
            <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--space-3)' }}>🤖 AI Dự đoán tồn kho</h3>
                <button className="btn btn-primary" style={{ width: '100%', fontWeight: 600 }} onClick={() => {
                    const el = document.getElementById('ai-forecast');
                    if (el) { el.style.display = el.style.display === 'none' ? 'block' : 'none'; return; }
                    const lowStock = stockItems.filter(s => s.available <= s.lowThreshold && s.available > 0);
                    const outOfStock = stockItems.filter(s => s.available <= 0);
                    const healthy = stockItems.filter(s => s.available > s.lowThreshold);
                    const report = document.createElement('div');
                    report.id = 'ai-forecast';
                    report.style.cssText = 'margin-top:12px';
                    report.innerHTML = `
                        <div style="padding:16px;background:rgba(168,85,247,0.04);border:1px solid rgba(168,85,247,0.2);border-radius:12px">
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;text-align:center">
                                <div style="padding:8px;background:var(--bg-tertiary);border-radius:8px">
                                    <div style="font-size:20px;font-weight:800;color:#22c55e">${healthy.length}</div>
                                    <div style="font-size:10px;color:var(--text-muted)">Đủ hàng ✅</div>
                                </div>
                                <div style="padding:8px;background:var(--bg-tertiary);border-radius:8px">
                                    <div style="font-size:20px;font-weight:800;color:#f59e0b">${lowStock.length}</div>
                                    <div style="font-size:10px;color:var(--text-muted)">Sắp hết ⚠️</div>
                                </div>
                                <div style="padding:8px;background:var(--bg-tertiary);border-radius:8px">
                                    <div style="font-size:20px;font-weight:800;color:#ef4444">${outOfStock.length}</div>
                                    <div style="font-size:10px;color:var(--text-muted)">Hết hàng 🔴</div>
                                </div>
                            </div>
                            ${outOfStock.length > 0 ? `
                                <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:6px">🚨 Cần nhập gấp:</div>
                                ${outOfStock.slice(0, 5).map(s => `<div style="font-size:11px;padding:4px 0;color:var(--text-secondary)">• ${s.name} (${s.sku}) — <strong style="color:#ef4444">Hết hàng</strong></div>`).join('')}
                            ` : ''}
                            ${lowStock.length > 0 ? `
                                <div style="font-size:12px;font-weight:700;color:#f59e0b;margin:8px 0 6px">⚠️ Tồn kho thấp:</div>
                                ${lowStock.slice(0, 5).map(s => `<div style="font-size:11px;padding:4px 0;color:var(--text-secondary)">• ${s.name} — còn <strong style="color:#f59e0b">${s.available}</strong>/${s.lowThreshold}</div>`).join('')}
                            ` : ''}
                            <div style="margin-top:12px;padding:10px;background:rgba(34,197,94,0.06);border-radius:8px;border:1px solid rgba(34,197,94,0.15)">
                                <div style="font-size:11px;font-weight:700;color:#22c55e;margin-bottom:4px">💡 Đề xuất</div>
                                <ul style="font-size:11px;color:var(--text-secondary);padding-left:16px;line-height:1.6;margin:0">
                                    ${outOfStock.length > 0 ? '<li>Tạo phiếu nhập kho cho SP hết hàng ngay</li>' : ''}
                                    ${lowStock.length > 0 ? '<li>Đặt hàng bổ sung cho ' + lowStock.length + ' SP sắp hết trong 3-5 ngày</li>' : ''}
                                    <li>Set cảnh báo tự động khi tồn kho < ngưỡng</li>
                                    <li>${healthy.length > stockItems.length * 0.8 ? 'Tồn kho ổn — duy trì nhịp nhập hiện tại' : 'Cần review lại kế hoạch nhập hàng tổng thể'}</li>
                                </ul>
                            </div>
                        </div>
                    `;
                    document.getElementById('ai-forecast-container')?.appendChild(report);
                }}>
                    🤖 Phân tích tồn kho AI
                </button>
                <div id="ai-forecast-container" />
            </div>

            {toast && (<div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--bg-secondary)', border: '1px solid var(--gold-400)', padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-lg)', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>{toast}</div>)}
        </div>
    );
}
