'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface HelpDoc { id: string; title: string; slug: string; moduleKey: string | null; }

export default function CrmHelpPage() {
    const { spaSlug } = useParams();
    const [docs, setDocs] = useState<HelpDoc[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const q = search ? `?search=${encodeURIComponent(search)}` : '';
        fetch(`/api/crm/${spaSlug}/help${q}`).then(r => r.json()).then(d => setDocs(d.docs || []));
    }, [spaSlug, search]);

    return (
        <div>
            <div className="page-header">
                <h1>❓ Hướng dẫn sử dụng</h1>
                <p>Tài liệu hướng dẫn sử dụng Spa CRM</p>
            </div>

            <div className="search-bar"><span>🔍</span><input placeholder="Tìm kiếm hướng dẫn..." value={search} onChange={e => setSearch(e.target.value)} /></div>

            {/* Quick guide */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>📖 Hướng dẫn nhanh</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
                    <p><strong>1. Khách hàng:</strong> Nhấn &quot;+ Thêm khách&quot; để tạo hồ sơ khách hàng. Tìm kiếm theo tên hoặc SĐT.</p>
                    <p><strong>2. Dịch vụ:</strong> Thêm dịch vụ với tên, thời gian, giá và danh mục. Tắt/bật dịch vụ bất kỳ lúc nào.</p>
                    <p><strong>3. Lịch hẹn:</strong> Tạo lịch hẹn gắn với khách hàng + dịch vụ. Xem theo ngày hoặc trạng thái.</p>
                    <p><strong>4. Phiếu thu:</strong> Tạo phiếu thu khi khách thanh toán. Theo dõi công nợ tự động.</p>
                    <p><strong>5. Module:</strong> Nâng cấp module tại Hub Portal để mở thêm tính năng.</p>
                </div>
            </div>

            {docs.length > 0 && (
                <div className="grid grid-2">
                    {docs.map(doc => (
                        <div key={doc.id} className="card">
                            <h4 style={{ fontWeight: 500 }}>{doc.title}</h4>
                            {doc.moduleKey && <span className="badge badge-info" style={{ fontSize: '11px', marginTop: '4px' }}>{doc.moduleKey}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
