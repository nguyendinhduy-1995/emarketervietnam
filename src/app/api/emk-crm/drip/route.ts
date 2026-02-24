import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ═══════ Types ═══════
interface DripStep {
    delay: number;      // days after trigger
    subject: string;
    body: string;
    channel: 'EMAIL' | 'ZALO' | 'SMS';
}

// ═══════ GET — List all drip campaigns ═══════
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const campaigns = await platformDb.emkDripCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: { select: { logs: true } },
            author: { select: { name: true } },
        },
    });

    const formatted = campaigns.map((c: { id: string; name: string; description: string | null; triggerStatus: string; stepsJson: unknown; isActive: boolean; author: { name: string } | null; _count: { logs: number }; createdAt: Date }) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        triggerStatus: c.triggerStatus,
        steps: c.stepsJson as DripStep[],
        isActive: c.isActive,
        author: c.author?.name || 'System',
        totalSent: c._count.logs,
        createdAt: c.createdAt,
    }));

    return NextResponse.json({ campaigns: formatted });
}

// ═══════ POST — Create campaign OR Execute drip ═══════
export async function POST(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();

    // Execute drip campaigns
    if (body.action === 'execute') return executeAllCampaigns(auth.user.userId);

    // AI-generate email steps
    if (body.action === 'ai-generate') return aiGenerateSteps(body.triggerStatus, body.leadContext);

    // Create new campaign
    if (!body.name || !body.triggerStatus || !body.steps) {
        return NextResponse.json({ error: 'name, triggerStatus, steps required' }, { status: 400 });
    }

    try {
        const campaign = await platformDb.emkDripCampaign.create({
            data: {
                name: body.name,
                description: body.description || null,
                triggerStatus: body.triggerStatus,
                stepsJson: body.steps,
                isActive: body.isActive ?? true,
                createdBy: auth.user.userId,
            },
        });
        return NextResponse.json({ campaign, message: 'Campaign created' });
    } catch (error: unknown) {
        console.error('Drip create error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ═══════ PUT — Toggle campaign active/inactive ═══════
export async function PUT(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id, isActive } = await req.json();
    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });

    await platformDb.emkDripCampaign.update({
        where: { id },
        data: { isActive },
    });

    return NextResponse.json({ message: 'Updated' });
}

// ═══════ DELETE — Remove campaign ═══════
export async function DELETE(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });

    // Delete logs first
    await platformDb.emkDripLog.deleteMany({ where: { campaignId: id } });
    await platformDb.emkDripCampaign.delete({ where: { id } });

    return NextResponse.json({ message: 'Deleted' });
}

// ═══════ AI Generate Steps ═══════
async function aiGenerateSteps(triggerStatus: string, leadContext?: string) {
    const STATUS_VN: Record<string, string> = {
        'NEW': 'Lead mới', 'CONTACTED': 'Đã liên hệ', 'ONBOARDING': 'Đang kích hoạt',
        'ACTIVE': 'Đang sử dụng', 'RENEWAL': 'Sắp gia hạn', 'AT_RISK': 'Có nguy cơ churn',
    };

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'system',
                content: `Bạn là chuyên gia email marketing cho phần mềm SaaS quản lý Spa/Salon. 
Tạo chuỗi 3-4 email drip cho leads ở trạng thái "${STATUS_VN[triggerStatus] || triggerStatus}".
Trả về JSON array: [{"delay": số_ngày, "subject": "tiêu đề", "body": "nội_dung_email", "channel": "EMAIL"}]
- delay=0 là gửi ngay khi trigger
- Nội dung ngắn gọn, thân thiện, chuyên nghiệp, tiếng Việt
- Mỗi email 3-5 dòng, có CTA rõ ràng
- Sử dụng {name} làm placeholder cho tên khách hàng`,
            }, {
                role: 'user',
                content: `Tạo chuỗi drip email cho leads "${triggerStatus}"${leadContext ? `. Context: ${leadContext}` : ''}`,
            }],
            max_tokens: 800,
            temperature: 0.7,
        });

        const raw = completion.choices[0]?.message?.content || '[]';
        // Extract JSON from response
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        const steps = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        return NextResponse.json({ steps });
    } catch {
        // Fallback default steps
        const defaults: DripStep[] = [
            { delay: 0, subject: `Chào mừng {name}!`, body: `Cảm ơn bạn đã quan tâm eMarketer Hub! Chúng tôi sẵn sàng hỗ trợ bạn.`, channel: 'EMAIL' },
            { delay: 3, subject: `{name}, có gì mới?`, body: `Bạn đã khám phá eMarketer Hub chưa? Đặt lịch demo miễn phí ngay!`, channel: 'EMAIL' },
            { delay: 7, subject: `Ưu đãi đặc biệt cho {name}`, body: `Đăng ký trước 15 ngày tới để nhận giảm 20% gói Premium!`, channel: 'EMAIL' },
        ];
        return NextResponse.json({ steps: defaults });
    }
}

// ═══════ Execute All Active Campaigns ═══════
async function executeAllCampaigns(userId: string) {
    const campaigns = await platformDb.emkDripCampaign.findMany({
        where: { isActive: true },
        include: { logs: { select: { leadId: true, stepIndex: true } } },
    });

    const results: { campaignName: string; matched: number; sent: number; skipped: number }[] = [];

    for (const campaign of campaigns) {
        const steps = campaign.stepsJson as unknown as DripStep[];
        const triggerStatus = campaign.triggerStatus;

        // Find accounts matching the trigger (use plan as trigger)
        const accounts = await platformDb.emkAccount.findMany({
            where: { plan: triggerStatus },
            select: { id: true, createdAt: true, workspace: { select: { name: true } } },
        });

        let sent = 0;
        let skipped = 0;
        const alreadySent = new Set(
            campaign.logs.map((l: { leadId: string; stepIndex: number }) => `${l.leadId}:${l.stepIndex}`)
        );

        for (const acct of accounts) {
            const acctAgeD = Math.floor((Date.now() - new Date(acct.createdAt).getTime()) / 86400000);
            const acctName = acct.workspace?.name || 'bạn';

            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const key = `${acct.id}:${i}`;

                if (alreadySent.has(key)) { skipped++; continue; }
                if (acctAgeD < step.delay) continue;

                const subject = step.subject.replace('{name}', acctName);
                await platformDb.emkDripLog.create({
                    data: {
                        campaignId: campaign.id,
                        leadId: acct.id, // backward compat field
                        stepIndex: i,
                        channel: step.channel || 'EMAIL',
                        status: 'SENT',
                        subject,
                    },
                });
                sent++;
            }
        }

        results.push({
            campaignName: campaign.name,
            matched: accounts.length,
            sent,
            skipped,
        });
    }

    // Log activity
    try {
        await platformDb.eventLog.create({
            data: {
                actorUserId: userId,
                type: 'DRIP_CAMPAIGNS_EXECUTED',
                payloadJson: { count: campaigns.length },
            },
        });
    } catch { /* ignore logging errors */ }

    return NextResponse.json({ results, executedAt: new Date().toISOString() });
}
