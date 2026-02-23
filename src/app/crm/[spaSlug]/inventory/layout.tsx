import { platformDb } from '@/lib/db/platform';
import { MODULE_KEYS } from '@/lib/constants';
import Link from 'next/link';

export default async function InventoryLayout(props: {
    children: React.ReactNode;
    params: Promise<{ spaSlug: string }>;
}) {
    const params = await props.params;

    // Resolve the tenant
    const workspace = await platformDb.workspace.findUnique({
        where: { slug: params.spaSlug },
        select: { id: true, name: true },
    });

    if (!workspace) {
        return (
            <div className="empty-state">
                <h3>Không tìm thấy Spa</h3>
            </div>
        );
    }

    // Check Inventory Entitlement
    const entitlement = await platformDb.entitlement.findFirst({
        where: {
            workspaceId: workspace.id,
            moduleKey: MODULE_KEYS.INVENTORY,
            status: 'ACTIVE',
        },
    });

    if (!entitlement) {
        return (
            <div className="empty-state" style={{ marginTop: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <h3>Tính năng Quản Lý Kho bị khóa</h3>
                <p>Gói dịch vụ hiện tại chưa kích hoạt module Inventory.</p>
                <Link href={`/crm/${params.spaSlug}/modules`} className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
                    Nâng cấp ngay
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>📦 Quản lý Kho</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link href={`/crm/${params.spaSlug}/inventory`} className="btn btn-secondary">Dashboard</Link>
                    <Link href={`/crm/${params.spaSlug}/inventory/categories`} className="btn btn-secondary">Danh mục</Link>
                    <Link href={`/crm/${params.spaSlug}/inventory/products`} className="btn btn-secondary">Sản phẩm & Tồn kho</Link>
                </div>
            </div>
            {props.children}
        </div>
    );
}
