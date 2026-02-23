'use client';
import { useEffect, useState } from 'react';

interface HelpDoc { id: string; title: string; slug: string; moduleKey: string | null; }

export default function HelpCenterPage() {
    const [docs, setDocs] = useState<HelpDoc[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const q = search ? `?search=${encodeURIComponent(search)}` : '';
        fetch(`/api/help${q}`).then(r => r.json()).then(d => setDocs(d.docs || []));
    }, [search]);

    // Onboarding checklist
    const checklist = [
        { step: 1, title: 'Thiết lập dịch vụ', desc: 'Thêm danh sách dịch vụ của Spa' },
        { step: 2, title: 'Thêm nhân viên', desc: 'Mời nhân viên vào workspace' },
        { step: 3, title: 'Tạo lịch hẹn đầu tiên', desc: 'Đặt lịch cho khách hàng' },
        { step: 4, title: 'Tạo phiếu thu', desc: 'Ghi nhận thanh toán đầu tiên' },
        { step: 5, title: 'Xem báo cáo', desc: 'Khám phá Dashboard Analytics' },
    ];

    return (
        <div>
            <div className="page-header">
                <h1>❓ Help Center</h1>
                <p>Hướng dẫn sử dụng và onboarding checklist</p>
            </div>

            {/* Onboarding */}
            <div className="card" style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>🎯 Onboarding Checklist</h3>
                {checklist.map(c => (
                    <div key={c.step} className="checklist-item">
                        <div className="check-icon">{c.step}</div>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>{c.title}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{c.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="search-bar">
                <span>🔍</span>
                <input placeholder="Tìm kiếm hướng dẫn..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Docs list */}
            <div className="grid grid-2">
                {docs.map(doc => (
                    <div key={doc.id} className="card" style={{ cursor: 'pointer' }}>
                        <h4 style={{ fontWeight: 500, marginBottom: '4px' }}>{doc.title}</h4>
                        {doc.moduleKey && <span className="badge badge-info" style={{ fontSize: '11px' }}>{doc.moduleKey}</span>}
                    </div>
                ))}
            </div>
            {docs.length === 0 && !search && (
                <div className="empty-state"><div className="empty-icon">📚</div><p>Chưa có tài liệu hướng dẫn</p></div>
            )}
        </div>
    );
}
