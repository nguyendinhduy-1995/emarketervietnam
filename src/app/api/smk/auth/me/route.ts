import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/smk/auth';

export async function GET() {
    const session = await getCustomerSession();
    if (!session) {
        return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({
        user: {
            id: session.userId,
            name: session.name,
            phone: session.phone,
            email: session.email,
        },
    });
}
