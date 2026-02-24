import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function POST(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const wsId = await resolveWorkspaceId(req, user);
    if (!wsId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const body = await req.json();
    const { orderId, imageData, note } = body;

    if (!imageData) {
        return NextResponse.json({ error: 'Vui lòng chọn ảnh chứng từ' }, { status: 400 });
    }

    // Store payment proof
    await platformDb.paymentProof.create({
        data: {
            workspaceId: wsId,
            orderId: orderId || null,
            imageUrl: imageData, // base64 for MVP; production: upload to S3/R2
            note: note || null,
        },
    });

    // Update order status to NEED_REVIEW if orderId provided
    if (orderId) {
        await platformDb.upgradeOrder.updateMany({
            where: { id: orderId, workspaceId: wsId, status: 'PENDING' },
            data: { status: 'NEED_REVIEW' },
        });
    }

    // Log event
    await platformDb.eventLog.create({
        data: {
            workspaceId: wsId,
            actorUserId: user.userId,
            type: 'PAYMENT_PROOF_UPLOADED',
            payloadJson: { orderId },
        },
    });

    return NextResponse.json({ ok: true });
}
