'use client';
import { useEffect, useState, useCallback } from 'react';

interface Rule {
    id: string;
    name: string;
    enabled: boolean;
    trigger: { type: string; status?: string; days?: number };
    action: { type: string; taskTitle?: string; taskType?: string; dueDays?: number; newStatus?: string };
    lastRun?: string;
    matchCount: number;
}

interface RunResult {
    ruleId: string;
    ruleName: string;
    matched: number;
    actions: string[];
}

const TRIGGER_VN: Record<string, string> = {
    'status_is': '📌 Status = ',
    'lead_age': '⏰ Lead > X ngày',
    'no_notes': '🔇 Không liên hệ > X ngày',
    'unassigned': '👤 Chưa assign owner',
};

const ACTION_VN: Record<string, string> = {
    'create_task': '📋 Tạo task',
    'change_status': '🔄 Đổi status',
    'assign_owner': '👤 Assign owner',
    'add_tag': '🏷️ Thêm tag',
};

export default function AutomationPage() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<RunResult[] | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    const loadRules = useCallback(() => {
        fetch('/api/emk-crm/automation')
            .then(r => r.json())
            .then(d => { setRules(d.rules || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => { loadRules(); }, [loadRules]);

    const toggleRule = async (ruleId: string) => {
        setToggling(ruleId);
        await fetch('/api/emk-crm/automation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle', ruleId }),
        });
        loadRules();
        setToggling(null);
    };

    const runAll = async () => {
        setRunning(true);
        setResults(null);
        const res = await fetch('/api/emk-crm/automation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'run' }),
        });
        const data = await res.json();
        setResults(data.results || []);
        setRunning(false);
        loadRules();
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: '100px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'autoPulse 1.5s ease-in-out infinite' }} />)}
            <style>{`@keyframes autoPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚡ Pipeline Automation
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        Tự động hoá quy trình CRM — {rules.filter(r => r.enabled).length}/{rules.length} rules đang bật
                    </p>
                </div>
                <button onClick={runAll} disabled={running} style={{
                    padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                    background: running ? 'var(--bg-input)' : 'linear-gradient(135deg, #22c55e, #3b82f6)',
                    color: running ? 'var(--text-muted)' : 'white', border: 'none',
                    cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    {running ? (
                        <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'autoPulse 0.8s linear infinite' }} /> Đang chạy...</>
                    ) : (
                        <>▶ Chạy tất cả</>
                    )}
                </button>
            </div>

            {/* Rules */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rules.map(rule => (
                    <div key={rule.id} style={{
                        padding: '16px', borderRadius: '14px',
                        background: rule.enabled ? 'var(--bg-card)' : 'rgba(107,114,128,0.04)',
                        border: `1px solid ${rule.enabled ? 'var(--border)' : 'rgba(107,114,128,0.1)'}`,
                        opacity: rule.enabled ? 1 : 0.6,
                        transition: 'all 200ms',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700 }}>{rule.name}</span>
                            </div>
                            <button
                                onClick={() => toggleRule(rule.id)}
                                disabled={toggling === rule.id}
                                style={{
                                    width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                                    background: rule.enabled ? '#22c55e' : '#d1d5db',
                                    cursor: 'pointer', position: 'relative', transition: 'background 200ms',
                                }}>
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                    position: 'absolute', top: '3px',
                                    left: rule.enabled ? '23px' : '3px',
                                    transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <div>
                                <span style={{ fontWeight: 600 }}>Điều kiện: </span>
                                {TRIGGER_VN[rule.trigger.type] || rule.trigger.type}
                                {rule.trigger.status && <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rule.trigger.status}</span>}
                                {rule.trigger.days && <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rule.trigger.days} ngày</span>}
                            </div>
                            <div>
                                <span style={{ fontWeight: 600 }}>Hành động: </span>
                                {ACTION_VN[rule.action.type] || rule.action.type}
                                {rule.action.taskTitle && ` "${rule.action.taskTitle}"`}
                                {rule.action.newStatus && ` → ${rule.action.newStatus}`}
                            </div>
                        </div>

                        {rule.lastRun && (
                            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                Chạy lần cuối: {new Date(rule.lastRun).toLocaleString('vi-VN')} · {rule.matchCount} leads khớp
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Run Results */}
            {results && (
                <div style={{
                    padding: '16px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(59,130,246,0.06))',
                    border: '1px solid rgba(34,197,94,0.15)',
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✅ Kết quả chạy Automation
                    </h3>
                    {results.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Không có rule nào được kích hoạt.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {results.map(r => (
                                <div key={r.ruleId} style={{
                                    padding: '8px 12px', borderRadius: '10px',
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    fontSize: '13px',
                                }}>
                                    <div style={{ fontWeight: 600 }}>{r.ruleName}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                                        {r.matched} leads khớp · {r.actions.length} hành động thực hiện
                                    </div>
                                    {r.actions.length > 0 && (
                                        <div style={{ marginTop: '4px', fontSize: '12px' }}>
                                            {r.actions.map((a, i) => <div key={i} style={{ color: '#22c55e' }}>✓ {a}</div>)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes autoPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );
}
