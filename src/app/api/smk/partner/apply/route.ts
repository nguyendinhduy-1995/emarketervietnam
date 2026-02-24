import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// POST /api/partner/apply — partner registration
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { userId, partnerCode, level, bankAccount, bio, storeName, channels } = body;

    if (!userId || !partnerCode) {
        return NextResponse.json({ error: 'userId and partnerCode required' }, { status: 400 });
    }

    // Validate code format
    if (!/^[A-Z0-9_]{3,15}$/i.test(partnerCode)) {
        return NextResponse.json({ error: 'Mã đối tác phải từ 3-15 ký tự (chữ, số, _)' }, { status: 400 });
    }

    // Check uniqueness
    const existing = await db.partnerProfile.findUnique({ where: { partnerCode: partnerCode.toUpperCase() } });
    if (existing) return NextResponse.json({ error: 'Mã đối tác đã tồn tại' }, { status: 409 });

    const profile = await db.partnerProfile.create({
        data: {
            userId,
            partnerCode: partnerCode.toUpperCase(),
            level: level === 'AGENT' ? 'AGENT' : 'AFFILIATE',
            bankAccount: bankAccount || null,
            bio,
            storeName,
        },
    });

    // Update user role
    await db.user.update({ where: { id: userId }, data: { role: 'PARTNER' } });

    // Log event
    await db.eventLog.create({
        data: { type: 'PARTNER_REGISTERED', userId, partnerId: profile.id, payload: { partnerCode, level, channels } },
    });

    return NextResponse.json({ profile }, { status: 201 });
}
