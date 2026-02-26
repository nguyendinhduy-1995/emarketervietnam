'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DownloadGrant { id: string; productId: string; assetId: string; maxDownloads: number; downloadCount: number; licenseKey: string | null; expiresAt: string | null; revokedAt: string | null; createdAt: string; asset: { filename: string; size: number; mimeType: string }; }

export default function DownloadsPage() {
    const [grants, setGrants] = useState<DownloadGrant[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/hub/downloads').then(r => r.json()).then(d => { setGrants(d.grants || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleDownload = async (grantId: string) => {
        setDownloading(grantId);
        const res = await fetch(`/api/hub/downloads?grantId=${grantId}&action=download`);
        const data = await res.json();
        if (data.downloadUrl) {
            window.open(data.downloadUrl, '_blank');
            // Refresh to update count
            const r = await fetch('/api/hub/downloads');
            const d = await r.json();
            setGrants(d.grants || []);
        } else {
            alert(data.error || 'Lỗi tải file');
        }
        setDownloading(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>📥 Tải về</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Tài liệu và sản phẩm số đã mua</p>

            {loading && <div style={{ height: '80px', borderRadius: '14px', background: 'var(--bg-card)' }} />}

            {!loading && grants.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', borderRadius: '16px', background: 'var(--bg-card)' }}>
                    <p style={{ fontSize: '32px', marginBottom: '8px' }}>📥</p>
                    <p style={{ fontWeight: 600 }}>Chưa có sản phẩm số</p>
                    <Link href="/hub/marketplace" style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '13px' }}>Khám phá Marketplace →</Link>
                </div>
            )}

            {!loading && grants.map(g => {
                const remaining = g.maxDownloads - g.downloadCount;
                const expired = g.expiresAt && new Date(g.expiresAt) < new Date();
                const revoked = !!g.revokedAt;
                const canDownload = remaining > 0 && !expired && !revoked;

                return (
                    <div key={g.id} style={{ padding: '14px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: canDownload ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '28px' }}>📄</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 700 }}>{g.asset.filename}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    {(g.asset.size / 1024 / 1024).toFixed(1)}MB · Đã tải {g.downloadCount}/{g.maxDownloads} lần
                                    {g.licenseKey && <> · <code style={{ fontSize: '9px', background: 'var(--bg-hover)', padding: '1px 4px', borderRadius: '3px' }}>{g.licenseKey}</code></>}
                                </div>
                                {revoked && <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600 }}>🚫 Đã thu hồi</div>}
                                {expired && !revoked && <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>⏰ Hết hạn</div>}
                            </div>
                            <button onClick={() => handleDownload(g.id)} disabled={!canDownload || downloading === g.id} style={{
                                padding: '8px 14px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '12px',
                                background: canDownload ? 'var(--accent-gradient)' : 'var(--bg-hover)',
                                color: canDownload ? '#fff' : 'var(--text-muted)', cursor: canDownload ? 'pointer' : 'not-allowed',
                                fontFamily: 'inherit',
                            }}>{downloading === g.id ? '⏳' : '📥 Tải'}</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
