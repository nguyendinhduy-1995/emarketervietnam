'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CrmDashboard() {
    const params = useParams();
    const slug = params.spaSlug as string;

    return (
        <div>
            <div className="page-header">
                <h1>📊 Dashboard</h1>
                <p>Tổng quan Spa CRM</p>
            </div>
            <div className="grid grid-4">
                {[
                    { icon: '👥', label: 'Khách hàng', href: `/crm/${slug}/customers`, color: '#6366f1' },
                    { icon: '📅', label: 'Lịch hẹn', href: `/crm/${slug}/appointments`, color: '#22c55e' },
                    { icon: '💆', label: 'Dịch vụ', href: `/crm/${slug}/services`, color: '#f59e0b' },
                    { icon: '🧾', label: 'Phiếu thu', href: `/crm/${slug}/receipts`, color: '#ef4444' },
                ].map(item => (
                    <Link key={item.href} href={item.href} className="card" style={{ textAlign: 'center', textDecoration: 'none', color: 'var(--text-primary)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>{item.icon}</div>
                        <div style={{ fontWeight: 600 }}>{item.label}</div>
                    </Link>
                ))}
            </div>

            <div className="card" style={{ marginTop: '32px', padding: '32px', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '12px' }}>🎯 Bắt đầu nhanh</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Hoàn thành onboarding checklist để setup Spa CRM nhanh nhất!
                </p>
                <Link href={`/crm/${slug}/onboarding`} className="btn btn-primary">
                    Xem Onboarding Checklist →
                </Link>
            </div>
        </div>
    );
}
