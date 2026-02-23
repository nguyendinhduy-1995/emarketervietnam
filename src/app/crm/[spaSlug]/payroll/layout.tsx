'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MODULE_KEYS } from '@/lib/constants';

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const [hasEntitlement, setHasEntitlement] = useState<boolean | null>(null);

    useEffect(() => {
        fetch('/api/subscription')
            .then((r) => r.json())
            .then((d) => {
                const ents = d.entitlements || [];
                const hasPayroll = ents.some(
                    (e: any) => e.moduleKey === MODULE_KEYS.COMMISSION && e.status === 'ACTIVE'
                );
                setHasEntitlement(hasPayroll);
            });
    }, []);

    if (hasEntitlement === null) {
        return <div style={{ padding: '60px', textAlign: 'center' }}><div className="loading-spinner" /></div>;
    }

    if (!hasEntitlement) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                <h2>Module Lương & Hoa Hồng chưa được kích hoạt</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Nâng cấp module tại Hub Portal để sử dụng tính năng tính lương và hoa hồng nhân viên.
                </p>
                <Link href="/marketplace" className="btn btn-primary">
                    Khám phá Hub Marketplace
                </Link>
                <br />
                <Link href={`/crm/${params.spaSlug}/modules`} className="btn btn-secondary" style={{ marginTop: '16px', display: 'inline-block' }}>
                    Quản lý Module của Spa
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
                <Link href={`/crm/${params.spaSlug}/payroll`} className="btn btn-secondary">Dashboard Lương</Link>
                <Link href={`/crm/${params.spaSlug}/payroll/rules`} className="btn btn-secondary">Cấu hình Hoa hồng</Link>
                <Link href={`/crm/${params.spaSlug}/payroll/payslips`} className="btn btn-secondary">Bảng lương (Payslips)</Link>
            </div>
            {children}
        </div>
    );
}
