'use client';
import { useEffect, useState } from 'react';

interface AiKey { id: string; provider: string; keyLast4: string; status: string; createdAt: string; }

export default function AiVaultPage() {
    const [keys, setKeys] = useState<AiKey[]>([]);
    const [form, setForm] = useState({ provider: 'OPENAI', apiKey: '' });
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => { loadKeys(); }, []);

    const loadKeys = () => {
        fetch('/api/ai-keys').then(r => r.json()).then(d => setKeys(d.keys || []));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch('/api/ai-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        setSaving(false);
        if (res.ok) { setMsg(`Đã lưu key cho ${form.provider}: ****${data.maskedKey.slice(-4)}`); setForm({ ...form, apiKey: '' }); loadKeys(); }
        else setMsg(data.error);
    };

    const handleTest = async (provider: string) => {
        setTestResult(null);
        const res = await fetch('/api/ai-keys/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) });
        setTestResult(await res.json());
    };

    return (
        <div>
            <div className="page-header">
                <h1>🔐 AI Vault (BYOK)</h1>
                <p>Quản lý API key cho các dịch vụ AI. Key được mã hóa AES-256-GCM.</p>
            </div>
            {msg && <div className="alert alert-success">{msg}</div>}
            {testResult && <div className={`alert ${testResult.success ? 'alert-success' : 'alert-danger'}`}>{testResult.message}</div>}

            {/* Add key form */}
            <form onSubmit={handleSave} className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Thêm/Cập nhật API Key</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select className="form-input" style={{ width: '160px' }} value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
                        <option value="OPENAI">OpenAI</option>
                        <option value="GOOGLE">Google AI</option>
                        <option value="ANTHROPIC">Anthropic</option>
                    </select>
                    <input className="form-input" style={{ flex: 1, minWidth: '250px' }} type="password" placeholder="sk-..." value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} required minLength={10} />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                        {saving ? 'Đang lưu...' : '💾 Lưu mã hoá'}
                    </button>
                </div>
            </form>

            {/* Keys list */}
            <div className="table-container">
                <table>
                    <thead><tr><th>Provider</th><th>Key (masked)</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr></thead>
                    <tbody>
                        {keys.map(k => (
                            <tr key={k.id}>
                                <td style={{ fontWeight: 600 }}>{k.provider}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>****{k.keyLast4}</td>
                                <td><span className={`badge ${k.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{k.status}</span></td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(k.createdAt).toLocaleString('vi-VN')}</td>
                                <td>
                                    <button onClick={() => handleTest(k.provider)} className="btn btn-secondary btn-sm">🧪 Test</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {keys.length === 0 && <div className="empty-state"><div className="empty-icon">🔑</div><p>Chưa có API key nào</p></div>}
        </div>
    );
}
