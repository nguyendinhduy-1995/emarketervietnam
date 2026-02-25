'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';

interface DnsVerification {
    verificationId: string;
    domain: string;
    txtRecord: string;
    txtValue: string;
    expiresAt: string;
    instructions: string[];
    status?: string;
    verifiedAt?: string;
}

interface CrmInstance {
    status: string;
    domain: string;
    crmUrl: string | null;
}

export default function DomainSettingsPage() {
    const { success, error: toastError } = useToast();
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [verification, setVerification] = useState<DnsVerification | null>(null);
    const [instance, setInstance] = useState<CrmInstance | null>(null);
    const [dnsStatus, setDnsStatus] = useState<string>('');

    // Load existing state
    useEffect(() => {
        fetch('/api/hub/today')
            .then(r => r.json())
            .then(d => {
                if (d.crmInstance) setInstance(d.crmInstance);
            })
            .catch(() => { });
    }, []);

    const handleInitDns = async () => {
        if (!domain.trim()) { toastError('Nhập tên miền'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/hub/dns/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domain.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { toastError(data.error); setLoading(false); return; }
            setVerification(data);
            success('Đã tạo token xác minh DNS!');
        } catch { toastError('Lỗi kết nối'); }
        setLoading(false);
    };

    const handleVerifyDns = async () => {
        if (!verification) return;
        setVerifying(true);
        setDnsStatus('');
        try {
            const res = await fetch('/api/hub/dns/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verificationId: verification.verificationId }),
            });
            const data = await res.json();
            if (data.verified) {
                success('✅ Domain đã được xác minh!');
                setDnsStatus('VERIFIED');
                setVerification(v => v ? { ...v, status: 'VERIFIED' } : v);
            } else {
                setDnsStatus(data.status || 'PENDING');
                toastError(data.error || 'Chưa tìm thấy TXT record');
            }
        } catch { toastError('Lỗi kết nối'); }
        setVerifying(false);
    };

    const handleDeploy = async () => {
        if (!verification) return;
        setDeploying(true);
        try {
            const res = await fetch('/api/hub/deploy/enqueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId: '', // resolved server-side
                    domain: verification.domain,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                success('🚀 CRM đang được triển khai!');
                setInstance({ status: 'DEPLOYING', domain: verification.domain, crmUrl: null });
            } else {
                toastError(data.error);
            }
        } catch { toastError('Lỗi kết nối'); }
        setDeploying(false);
    };

    const card: React.CSSProperties = {
        padding: '18px', borderRadius: '16px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: '14px',
    };
    const input: React.CSSProperties = {
        width: '100%', padding: '12px 16px', borderRadius: '12px',
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box',
    };
    const btn = (accent = false, disabled = false): React.CSSProperties => ({
        padding: '12px 20px', borderRadius: '12px', fontWeight: 700,
        background: accent ? 'var(--accent-gradient)' : 'var(--bg-input)',
        border: accent ? 'none' : '1px solid var(--border)',
        color: accent ? 'white' : 'var(--text-primary)',
        cursor: disabled ? 'wait' : 'pointer', fontSize: '14px', fontFamily: 'inherit',
        opacity: disabled ? 0.6 : 1, width: '100%',
    });
    const label: React.CSSProperties = {
        fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>🌐 Domain & CRM</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Kết nối tên miền riêng và triển khai CRM</p>
            </div>

            {/* CRM Instance Status */}
            {instance && (
                <section>
                    <h2 style={label}>Trạng thái CRM</h2>
                    <div style={card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '28px' }}>
                                {instance.status === 'ACTIVE' ? '✅' : instance.status === 'DEPLOYING' ? '⏳' : instance.status === 'SUSPENDED' ? '⚠️' : '📋'}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '16px' }}>{instance.domain}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    {instance.status === 'ACTIVE' ? 'Đang hoạt động' :
                                        instance.status === 'DEPLOYING' ? 'Đang triển khai... (5-15 phút)' :
                                            instance.status === 'SUSPENDED' ? 'Tạm ngưng — nạp ví để kích hoạt lại' :
                                                instance.status}
                                </div>
                            </div>
                        </div>
                        {instance.crmUrl && (
                            <a href={instance.crmUrl} target="_blank" rel="noreferrer" style={{
                                ...btn(true), textAlign: 'center', textDecoration: 'none', display: 'block',
                            }}>
                                🚀 Mở CRM
                            </a>
                        )}
                    </div>
                </section>
            )}

            {/* DNS Setup (only if no active instance) */}
            {(!instance || instance.status === 'PENDING') && (
                <>
                    {/* Step 1: Enter domain */}
                    <section>
                        <h2 style={label}>Bước 1: Nhập tên miền</h2>
                        <div style={card}>
                            <input
                                value={domain} onChange={e => setDomain(e.target.value)}
                                style={input} placeholder="vd: crm.congty.vn"
                            />
                            <button onClick={handleInitDns} disabled={loading} style={btn(true, loading)}>
                                {loading ? 'Đang tạo...' : '🔑 Tạo token xác minh'}
                            </button>
                        </div>
                    </section>

                    {/* Step 2: DNS Instructions */}
                    {verification && (
                        <section>
                            <h2 style={label}>Bước 2: Thêm DNS Record</h2>
                            <div style={card}>
                                <div style={{
                                    padding: '14px', borderRadius: '12px',
                                    background: 'var(--bg-input)', fontFamily: 'monospace', fontSize: '13px',
                                    wordBreak: 'break-all', lineHeight: 1.6,
                                }}>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>TXT Record:</div>
                                    <div><strong>Tên:</strong> {verification.txtRecord}</div>
                                    <div><strong>Giá trị:</strong> {verification.txtValue}</div>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    {verification.instructions?.map((inst, i) => (
                                        <div key={i} style={{ marginBottom: '4px' }}>{inst}</div>
                                    ))}
                                </div>
                                <button onClick={handleVerifyDns} disabled={verifying} style={btn(true, verifying)}>
                                    {verifying ? 'Đang kiểm tra...' : '🔍 Xác minh DNS'}
                                </button>
                                {dnsStatus && dnsStatus !== 'VERIFIED' && (
                                    <div style={{
                                        fontSize: '13px', color: '#f59e0b',
                                        padding: '8px 12px', borderRadius: '8px',
                                        background: 'rgba(245,158,11,0.1)',
                                    }}>
                                        ⏳ DNS chưa propagate. Thử lại sau 5-30 phút.
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Step 3: Deploy */}
                    {dnsStatus === 'VERIFIED' && (
                        <section>
                            <h2 style={label}>Bước 3: Triển khai CRM</h2>
                            <div style={card}>
                                <div style={{ fontSize: '15px', textAlign: 'center' }}>
                                    ✅ Domain <strong>{verification?.domain}</strong> đã được xác minh!
                                </div>
                                <button onClick={handleDeploy} disabled={deploying} style={btn(true, deploying)}>
                                    {deploying ? 'Đang triển khai...' : '🚀 Triển khai CRM ngay'}
                                </button>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
