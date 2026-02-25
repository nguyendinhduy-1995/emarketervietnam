import { platformDb as db } from '@/lib/db/platform';

/**
 * Notification Processor
 * 
 * Processes NotificationQueue → sends emails via SMTP.
 * Called by cron endpoint every 5 minutes.
 */

interface NotificationResult {
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
}

export async function processNotifications(batchSize = 20): Promise<NotificationResult> {
    const result: NotificationResult = { processed: 0, sent: 0, failed: 0, errors: [] };

    // Fetch pending notifications
    const pending = await db.notificationQueue.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
    });

    for (const notif of pending) {
        result.processed++;

        try {
            // Mark as processing
            await db.notificationQueue.update({
                where: { id: notif.id },
                data: { status: 'SENT', sentAt: new Date() },
            });

            // Look up user email
            const user = await db.user.findUnique({
                where: { id: notif.userId },
                select: { email: true, name: true },
            });

            // Send email if user has email
            if (user?.email) {
                await sendEmail({
                    to: user.email,
                    subject: notif.title,
                    html: buildEmailHtml(notif.title, notif.body ?? '', user.name || 'Bạn'),
                });
            }

            result.sent++;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            result.errors.push(`${notif.id}: ${errMsg}`);
            result.failed++;

            await db.notificationQueue.update({
                where: { id: notif.id },
                data: { status: 'FAILED' },
            });
        }
    }

    return result;
}

async function sendEmail(opts: { to: string; subject: string; html: string }) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.log(`[EMAIL] SMTP not configured — skipping: ${opts.subject} → ${opts.to}`);
        return;
    }

    try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: { user, pass },
        });
        const from = process.env.EMAIL_FROM || 'eMarketer Hub <noreply@emarketervietnam.vn>';
        await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
    } catch {
        console.log(`[EMAIL] Send failed: "${opts.subject}" → ${opts.to}`);
    }
}

function buildEmailHtml(title: string, body: string, userName: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<div style="text-align:center;margin-bottom:24px"><span style="font-size:24px;font-weight:800;color:#6366f1">⚡ eMarketer Hub</span></div>
<p style="color:#374151;font-size:15px">Xin chào <strong>${userName}</strong>,</p>
<h2 style="color:#111827;font-size:18px;margin:16px 0 8px">${title}</h2>
<p style="color:#4b5563;font-size:14px;line-height:1.6">${body}</p>
<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://emarketervietnam.vn'}/hub" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px">Mở Hub →</a>
</div></div></body></html>`;
}
