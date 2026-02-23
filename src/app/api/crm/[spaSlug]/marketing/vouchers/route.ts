import { NextRequest, NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { requireTenant } from '@/lib/tenant';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const vouchers = await spaDb.voucher.findMany({
            where: { workspaceId: tenant.workspaceId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(vouchers);
    } catch (error) {
        console.error('[VOUCHERS_GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const body = await request.json();
        const { code, type, value, minOrderValue, maxDiscount, limit, expiresAt } = body;

        if (!code || !type || value === undefined) {
            return NextResponse.json({ error: 'Vui lòng nhập mã, loại và giá trị giảm giá.' }, { status: 400 });
        }

        // Check for duplicate code
        const existing = await spaDb.voucher.findFirst({
            where: { workspaceId: tenant.workspaceId, code: code.toUpperCase() }
        });
        if (existing) {
            return NextResponse.json({ error: 'Mã giảm giá này đã tồn tại.' }, { status: 400 });
        }

        const voucher = await spaDb.voucher.create({
            data: {
                workspaceId: tenant.workspaceId,
                code: code.toUpperCase(),
                type,
                value: Number(value),
                minOrderValue: Number(minOrderValue || 0),
                maxDiscount: Number(maxDiscount || 0),
                limit: Number(limit || 100),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isActive: true
            }
        });

        return NextResponse.json(voucher);
    } catch (error) {
        console.error('[VOUCHERS_POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
