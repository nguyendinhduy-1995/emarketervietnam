'use client';
import { useState } from 'react';

interface ExportOption {
    type: string;
    label: string;
    icon: string;
    description: string;
    color: string;
}

const EXPORTS: ExportOption[] = [
    { type: 'accounts', label: 'Tài khoản', icon: '👤', description: 'Danh sách tài khoản + plan, status, source, UTM', color: '#6366f1' },
    { type: 'accounts', label: 'Tài khoản', icon: '🏢', description: 'Workspace plans, trial dates, activity', color: '#3b82f6' },
    { type: 'tasks', label: 'Công việc', icon: '✅', description: 'Tasks + type, due date, owner, tài khoản', color: '#22c55e' },
    { type: 'revenue', label: 'Doanh thu', icon: '💰', description: 'Lịch sử thanh toán + provider, workspace', color: '#f59e0b' },
];

export default function ReportsPage() {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ type: string; csv: string; filename: string } | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const download = async (type: string) => {
        setDownloading(type);
        try {
            const res = await fetch(`/api/emk-crm/export?type=${type}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || `${type}_export.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
        setDownloading(null);
    };

    const showPreview = async (type: string) => {
        if (preview?.type === type) { setPreview(null); return; }
        setLoadingPreview(true);
        try {
            const res = await fetch(`/api/emk-crm/export?type=${type}&format=json`);
            const data = await res.json();
            setPreview({ type, csv: data.csv, filename: data.filename });
        } catch { /* ignore */ }
        setLoadingPreview(false);
    };

    const parseCsvPreview = (csv: string): { headers: string[]; rows: string[][] } => {
        const lines = csv.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
        if (lines.length === 0) return { headers: [], rows: [] };
        const parse = (line: string) => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            for (const char of line) {
                if (char === '"') { inQuotes = !inQuotes; continue; }
                if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
                current += char;
            }
            result.push(current);
            return result;
        };
        return { headers: parse(lines[0]), rows: lines.slice(1, 11).map(parse) };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg> Báo cáo & Xuất dữ liệu
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Tải xuống CSV cho Excel/Google Sheets</p>
            </div>

            {/* Export cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {EXPORTS.map(exp => (
                    <div key={exp.type} style={{
                        padding: '20px', borderRadius: '16px', background: 'var(--bg-card)',
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: `${exp.color}12`, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '20px',
                            }}>
                                {exp.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>{exp.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{exp.description}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => download(exp.type)} disabled={downloading === exp.type} style={{
                                flex: 1, padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                                background: `linear-gradient(135deg, ${exp.color}, ${exp.color}cc)`,
                                border: 'none', color: 'white', cursor: downloading === exp.type ? 'wait' : 'pointer',
                                fontFamily: 'inherit', opacity: downloading === exp.type ? 0.6 : 1,
                                transition: 'all 150ms ease',
                            }}>
                                {downloading === exp.type ? '⏳ Đang tải…' : '📥 Tải CSV'}
                            </button>
                            <button onClick={() => showPreview(exp.type)} disabled={loadingPreview} style={{
                                padding: '10px 14px', borderRadius: '12px', fontWeight: 600, fontSize: '13px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit',
                                transition: 'all 150ms ease',
                            }}>
                                👁
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview */}
            {preview && (() => {
                const { headers, rows } = parseCsvPreview(preview.csv);
                return (
                    <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                                📋 Preview: {preview.filename} ({rows.length}+ dòng)
                            </h3>
                            <button onClick={() => setPreview(null)} style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: '18px', padding: '4px',
                            }}>×</button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        {headers.map((h, i) => (
                                            <th key={i} style={{
                                                padding: '8px 10px', textAlign: 'left', fontWeight: 700,
                                                borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap',
                                                color: 'var(--accent-primary)', fontSize: '11px', textTransform: 'uppercase',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i}>
                                            {row.map((cell, j) => (
                                                <td key={j} style={{
                                                    padding: '8px 10px', borderBottom: '1px solid var(--border)',
                                                    whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {rows.length >= 10 && (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0', textAlign: 'center', fontStyle: 'italic' }}>
                                Hiển thị 10 dòng đầu · Tải CSV để xem toàn bộ
                            </p>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
