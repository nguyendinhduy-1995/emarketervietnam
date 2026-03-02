'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface SetupData {
    order: {
        id: string;
        status: string;
        totalAmount: number;
        note: string | null;
    };
    dnsVerification: {
        id: string;
        domain: string;
        verifyToken: string;
        status: string;
        txtRecord: string;
        expiresAt: string;
    } | null;
    crmInstance: {
        id: string;
        domain: string;
        status: string;
        crmUrl: string | null;
    } | null;
}

const STEPS = [
    { key: 'PAID_WAITING_DOMAIN_VERIFY', label: 'Cấu hình DNS', icon: '🌐' },
    { key: 'DOMAIN_VERIFIED', label: 'Xác minh domain', icon: '✅' },
    { key: 'DEPLOYING', label: 'Triển khai CRM', icon: '🚀' },
    { key: 'DELIVERED_ACTIVE', label: 'Hoàn tất', icon: '🎉' },
];

export default function CrmSetupPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const router = useRouter();
    const [data, setData] = useState<SetupData | null>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState('');

    const loadData = useCallback(async () => {
        try {
            const r = await fetch(`/api/hub/setup/${orderId}`);
            if (!r.ok) throw new Error('Failed to load');
            const d = await r.json();
            setData(d);
        } catch {
            setError('Không thể tải thông tin đơn hàng');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-poll when deploying
    useEffect(() => {
        if (data?.order.status === 'DEPLOYING') {
            const interval = setInterval(loadData, 5000);
            return () => clearInterval(interval);
        }
    }, [data?.order.status, loadData]);

    const currentStepIndex = STEPS.findIndex(s => s.key === data?.order.status);

    const handleVerifyDns = async () => {
        if (!data?.dnsVerification || !data?.crmInstance) return;
        setVerifying(true);
        setError('');
        try {
            // Use new domain verify check endpoint
            const r = await fetch('/api/hub/domain/verify/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: data.dnsVerification.domain,
                    workspaceId: data.crmInstance.id,
                }),
            });
            const d = await r.json();
            if (d.ok && (d.status === 'VERIFIED' || d.status === 'ALREADY_VERIFIED')) {
                loadData();
            } else {
                const issues = d.issues?.join('; ') || d.error || d.message;
                setError(issues || 'DNS chưa được xác minh. Vui lòng chờ 5-60 phút.');
            }
        } catch {
            setError('Lỗi kết nối');
        } finally {
            setVerifying(false);
        }
    };

    const handleDeploy = async () => {
        if (!data?.crmInstance) return;
        setDeploying(true);
        setError('');
        try {
            const r = await fetch('/api/hub/deploy/enqueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId: data.crmInstance.id, // will be resolved from order
                    domain: data.crmInstance.domain,
                }),
            });
            const d = await r.json();
            if (d.ok) {
                loadData();
            } else {
                setError(d.error || 'Lỗi triển khai');
            }
        } catch {
            setError('Lỗi kết nối');
        } finally {
            setDeploying(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 2000);
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                <div style={{ color: 'var(--text-muted)' }}>Đang tải...</div>
            </div>
        </div>
    );

    if (!data) return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>❌</div>
            <div>{error || 'Không tìm thấy đơn hàng'}</div>
        </div>
    );

    const dns = data.dnsVerification;
    const instance = data.crmInstance;
    let orderMeta: Record<string, string> = {};
    try { if (data.order.note) orderMeta = JSON.parse(data.order.note); } catch { /* invalid JSON in note */ }

    return (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
            <style>{`
                .setup-card {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 16px; padding: 24px; margin-bottom: 16px;
                }
                .setup-stepper {
                    display: flex; justify-content: space-between; margin-bottom: 32px;
                    position: relative; padding: 0 8px;
                }
                .setup-stepper::before {
                    content: ''; position: absolute; top: 20px; left: 32px; right: 32px;
                    height: 3px; background: var(--border); z-index: 0;
                }
                .step-item {
                    display: flex; flex-direction: column; align-items: center;
                    position: relative; z-index: 1; flex: 1;
                }
                .step-circle {
                    width: 40px; height: 40px; border-radius: 50%; display: flex;
                    align-items: center; justify-content: center; font-size: 18px;
                    background: var(--bg-card); border: 3px solid var(--border);
                    transition: all 0.3s ease;
                }
                .step-circle.active {
                    border-color: var(--accent-primary);
                    background: var(--accent-primary);
                    box-shadow: 0 0 12px rgba(99,102,241,0.4);
                }
                .step-circle.done {
                    border-color: #22c55e; background: #22c55e;
                }
                .step-label {
                    font-size: 11px; font-weight: 600; margin-top: 8px;
                    color: var(--text-muted); text-align: center;
                }
                .step-label.active { color: var(--accent-primary); }
                .step-label.done { color: #22c55e; }
                .dns-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 12px 16px; border-radius: 10px; background: var(--bg-input);
                    border: 1px solid var(--border); margin-bottom: 8px;
                }
                .dns-value {
                    font-family: 'SF Mono', monospace; font-size: 12px;
                    word-break: break-all; flex: 1;
                }
                .copy-btn {
                    padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700;
                    background: var(--accent-primary); color: white; border: none;
                    cursor: pointer; white-space: nowrap; margin-left: 8px;
                }
                .copy-btn:hover { opacity: 0.9; }
                .action-btn {
                    width: 100%; padding: 14px; border-radius: 12px; font-size: 15px;
                    font-weight: 700; border: none; cursor: pointer; font-family: inherit;
                    transition: all 0.2s ease;
                }
                .action-btn.primary {
                    background: linear-gradient(135deg, var(--accent-primary), #7c3aed);
                    color: white;
                }
                .action-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
                .action-btn.primary:disabled { opacity: 0.6; cursor: wait; transform: none; }
                .action-btn.success {
                    background: linear-gradient(135deg, #22c55e, #16a34a); color: white;
                }
                .pulse { animation: pulse 2s ease-in-out infinite; }
                @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
            `}</style>

            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
                🏗️ Cài đặt CRM
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                {orderMeta.businessName || 'CRM instance'} · {dns?.domain || ''}
            </p>

            {/* Stepper */}
            <div className="setup-stepper">
                {STEPS.map((step, i) => (
                    <div key={step.key} className="step-item">
                        <div className={`step-circle ${i < currentStepIndex ? 'done' : i === currentStepIndex ? 'active' : ''}`}>
                            {i < currentStepIndex ? '✓' : step.icon}
                        </div>
                        <div className={`step-label ${i < currentStepIndex ? 'done' : i === currentStepIndex ? 'active' : ''}`}>
                            {step.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                    background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444',
                    fontSize: '13px', fontWeight: 600,
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Step Content */}
            {data.order.status === 'PAID_WAITING_DOMAIN_VERIFY' && dns && (
                <div className="setup-card">
                    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                        🌐 Cấu hình DNS cho <strong>{dns.domain}</strong>
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Thêm các DNS record sau vào nhà cung cấp domain của bạn (Cloudflare, GoDaddy, v.v.)
                    </p>

                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        1. TXT Record (xác minh sở hữu)
                    </div>
                    <div className="dns-row">
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tên</div>
                            <div className="dns-value">_emk-verify.{dns.domain}</div>
                        </div>
                        <button className="copy-btn" onClick={() => copyToClipboard(`_emk-verify.${dns.domain}`, 'name')}>
                            {copied === 'name' ? '✓' : '📋'}
                        </button>
                    </div>
                    <div className="dns-row">
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Giá trị</div>
                            <div className="dns-value">{dns.verifyToken}</div>
                        </div>
                        <button className="copy-btn" onClick={() => copyToClipboard(dns.verifyToken, 'value')}>
                            {copied === 'value' ? '✓' : '📋'}
                        </button>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', marginTop: '16px', textTransform: 'uppercase' }}>
                        2. A Record (trỏ domain về server)
                    </div>
                    <div className="dns-row">
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tên</div>
                            <div className="dns-value">{dns.domain}</div>
                        </div>
                        <button className="copy-btn" onClick={() => copyToClipboard(dns.domain, 'aname')}>
                            {copied === 'aname' ? '✓' : '📋'}
                        </button>
                    </div>
                    <div className="dns-row">
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Giá trị (IP)</div>
                            <div className="dns-value">76.13.190.139</div>
                        </div>
                        <button className="copy-btn" onClick={() => copyToClipboard('76.13.190.139', 'ip')}>
                            {copied === 'ip' ? '✓' : '📋'}
                        </button>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <button className="action-btn primary" onClick={handleVerifyDns} disabled={verifying}>
                            {verifying ? '⏳ Đang kiểm tra DNS...' : '🔍 Tôi đã trỏ xong — Xác minh ngay'}
                        </button>
                    </div>

                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                        DNS có thể mất 5-30 phút để propagate. Token hết hạn: {new Date(dns.expiresAt).toLocaleString('vi-VN')}
                    </p>
                </div>
            )}

            {data.order.status === 'DOMAIN_VERIFIED' && (
                <div className="setup-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                        Domain đã xác minh!
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        {instance?.domain} đã sẵn sàng. Bấm bên dưới để bắt đầu triển khai CRM.
                    </p>
                    <button className="action-btn primary" onClick={handleDeploy} disabled={deploying}>
                        {deploying ? '⏳ Đang khởi tạo...' : '🚀 Triển khai CRM ngay'}
                    </button>
                </div>
            )}

            {data.order.status === 'DEPLOYING' && (
                <div className="setup-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }} className="pulse">🚀</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                        Đang triển khai CRM...
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Hệ thống đang tạo máy chủ, cơ sở dữ liệu và cấu hình SSL cho {instance?.domain}.
                        Quá trình này thường mất 5-15 phút.
                    </p>
                    <div style={{
                        height: '6px', borderRadius: '3px', background: 'var(--border)',
                        overflow: 'hidden', marginBottom: '8px',
                    }}>
                        <div className="pulse" style={{
                            height: '100%', width: '60%', borderRadius: '3px',
                            background: 'linear-gradient(90deg, var(--accent-primary), #7c3aed)',
                        }} />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Trang sẽ tự cập nhật khi hoàn tất
                    </p>
                </div>
            )}

            {data.order.status === 'DELIVERED_ACTIVE' && instance && (
                <div className="setup-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                        CRM đã sẵn sàng!
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        Hệ thống CRM tại <strong>{instance.domain}</strong> đã được triển khai thành công.
                    </p>
                    <a
                        href={instance.crmUrl || `https://${instance.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-btn success"
                        style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}
                    >
                        🏢 Mở CRM →
                    </a>
                    <button
                        onClick={() => router.push('/hub/orders')}
                        style={{
                            marginTop: '10px', padding: '10px', background: 'none',
                            border: 'none', color: 'var(--accent-primary)', cursor: 'pointer',
                            fontWeight: 600, fontSize: '13px',
                        }}
                    >
                        ← Quay về Đơn hàng
                    </button>
                </div>
            )}
        </div>
    );
}
