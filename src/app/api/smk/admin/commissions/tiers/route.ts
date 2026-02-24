import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

// GET /api/smk/admin/commissions/tiers — get commission tier configuration
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const rules = await db.commissionRule.findMany({
        orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
    });

    // Default tiers if no rules exist
    const defaultTiers = [
        { level: 'AFFILIATE', percent: 5, label: 'Cộng tác viên' },
        { level: 'AGENT', percent: 8, label: 'Đại lý' },
        { level: 'LEADER', percent: 12, label: 'Trưởng nhóm' },
    ];

    return NextResponse.json({ rules, defaultTiers });
}

// POST /api/smk/admin/commissions/tiers — create or update commission rules
export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const { scope, scopeId, partnerLevel, percent, fixed, isActive } = await req.json();

    if (!scope || percent === undefined) {
        return NextResponse.json({ error: 'scope and percent required' }, { status: 400 });
    }

    if (!['GLOBAL', 'CATEGORY', 'PRODUCT'].includes(scope)) {
        return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }

    // Find existing rule for same scope+level combo
    const existing = await db.commissionRule.findFirst({
        where: { scope, scopeId: scopeId || null, partnerLevel: partnerLevel || null },
    });

    let rule;
    if (existing) {
        rule = await db.commissionRule.update({
            where: { id: existing.id },
            data: { percent, fixed: fixed || null, isActive: isActive !== false },
        });
    } else {
        rule = await db.commissionRule.create({
            data: {
                scope: scope as 'GLOBAL' | 'CATEGORY' | 'PRODUCT',
                scopeId: scopeId || null,
                partnerLevel: partnerLevel as 'AFFILIATE' | 'AGENT' | 'LEADER' | null,
                percent,
                fixed: fixed || null,
                isActive: isActive !== false,
            },
        });
    }

    return NextResponse.json({ rule }, { status: 201 });
}
