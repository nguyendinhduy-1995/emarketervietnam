/**
 * Email Notification Service
 * Sends transactional emails via SMTP (Nodemailer-compatible).
 * Falls back to console logging in dev if SMTP not configured.
 */

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'eMarketer Hub';
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@emarketervietnam.vn';

const isConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

/**
 * Send email. In dev without SMTP config, logs to console.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    if (!isConfigured) {
        console.log(`📧 [DEV] Email to ${payload.to}: "${payload.subject}"`);
        console.log(`   Body: ${payload.text || payload.html.slice(0, 200)}...`);
        return { ok: true, messageId: `dev-${Date.now()}` };
    }

    try {
        // Dynamic import to avoid bundling issues
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        const info = await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
        });

        return { ok: true, messageId: info.messageId };
    } catch (e) {
        console.error('Email send failed:', e);
        return { ok: false, error: String(e) };
    }
}

// ─── Email Templates ─────────────────────────────────────

function baseTemplate(content: string) {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
.container { max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.header { background: linear-gradient(135deg, #6366f1, #a855f7); padding: 24px; color: white; text-align: center; }
.header h1 { margin: 0; font-size: 20px; font-weight: 800; }
.body { padding: 24px; }
.body h2 { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
.body p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 12px; }
.info-box { background: #f1f5f9; border-radius: 10px; padding: 14px; margin: 12px 0; }
.info-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
.btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 12px 0; }
.footer { padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
</style></head><body>
<div class="container">
<div class="header"><h1>⚡ eMarketer Hub</h1></div>
<div class="body">${content}</div>
<div class="footer">© ${new Date().getFullYear()} eMarketer Vietnam · <a href="https://emarketervietnam.vn" style="color:#6366f1">emarketervietnam.vn</a></div>
</div></body></html>`;
}

/** Order confirmation email */
export function orderConfirmationEmail(data: {
    customerName: string; productName: string; amount: number;
    orderId: string; paymentMethod: string;
}) {
    const amountStr = data.amount.toLocaleString('vi-VN') + 'đ';
    return {
        subject: `✅ Xác nhận đơn hàng — ${data.productName}`,
        html: baseTemplate(`
            <h2>Xin chào ${data.customerName}!</h2>
            <p>Đơn hàng của bạn đã được xử lý thành công.</p>
            <div class="info-box">
                <div class="info-row"><span>Sản phẩm</span><strong>${data.productName}</strong></div>
                <div class="info-row"><span>Số tiền</span><strong>${amountStr}</strong></div>
                <div class="info-row"><span>Thanh toán</span><strong>${data.paymentMethod}</strong></div>
                <div class="info-row"><span>Mã đơn</span><strong>${data.orderId.slice(0, 12)}...</strong></div>
            </div>
            <a href="https://emarketervietnam.vn/hub/orders" class="btn">Xem đơn hàng →</a>
        `),
        text: `Đơn hàng ${data.productName} (${amountStr}) đã được xử lý. Mã: ${data.orderId}`,
    };
}

/** Subscription expiry warning */
export function expiryWarningEmail(data: {
    customerName: string; productName: string; expiresAt: Date;
}) {
    const dateStr = data.expiresAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return {
        subject: `⚠️ Sắp hết hạn — ${data.productName}`,
        html: baseTemplate(`
            <h2>Xin chào ${data.customerName}!</h2>
            <p>Gói <strong>${data.productName}</strong> của bạn sẽ hết hạn vào <strong>${dateStr}</strong>.</p>
            <p>Hãy gia hạn sớm để không bị gián đoạn dịch vụ.</p>
            <a href="https://emarketervietnam.vn/hub/marketplace" class="btn">Gia hạn ngay →</a>
        `),
        text: `Gói ${data.productName} sẽ hết hạn ${dateStr}. Truy cập Hub để gia hạn.`,
    };
}

/** Welcome / Registration email */
export function welcomeEmail(data: { customerName: string }) {
    return {
        subject: `🎉 Chào mừng ${data.customerName} đến eMarketer Hub!`,
        html: baseTemplate(`
            <h2>Chào mừng bạn, ${data.customerName}! 🎉</h2>
            <p>Tài khoản của bạn đã được tạo thành công trên <strong>eMarketer Hub</strong>.</p>
            <p>Khám phá các sản phẩm số, CRM và ứng dụng dành cho doanh nghiệp của bạn.</p>
            <a href="https://emarketervietnam.vn/hub/marketplace" class="btn">Khám phá ngay →</a>
        `),
        text: `Chào mừng ${data.customerName} đến eMarketer Hub! Truy cập emarketervietnam.vn/hub để bắt đầu.`,
    };
}

/** Entitlement granted email */
export function entitlementGrantedEmail(data: {
    customerName: string; featureName: string; expiresAt?: Date;
}) {
    const expiryInfo = data.expiresAt
        ? `<div class="info-row"><span>Hết hạn</span><strong>${data.expiresAt.toLocaleDateString('vi-VN')}</strong></div>`
        : '';
    return {
        subject: `🔑 Tính năng đã kích hoạt — ${data.featureName}`,
        html: baseTemplate(`
            <h2>Xin chào ${data.customerName}!</h2>
            <p>Tính năng <strong>${data.featureName}</strong> đã được kích hoạt cho tài khoản của bạn.</p>
            <div class="info-box">
                <div class="info-row"><span>Tính năng</span><strong>${data.featureName}</strong></div>
                ${expiryInfo}
            </div>
            <a href="https://emarketervietnam.vn/hub" class="btn">Truy cập Hub →</a>
        `),
        text: `Tính năng "${data.featureName}" đã kích hoạt. Truy cập Hub để sử dụng.`,
    };
}

/** Password reset email */
export function passwordResetEmail(data: { customerName: string; resetLink: string }) {
    return {
        subject: `🔒 Đặt lại mật khẩu — eMarketer Hub`,
        html: baseTemplate(`
            <h2>Xin chào ${data.customerName}!</h2>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tiếp tục:</p>
            <a href="${data.resetLink}" class="btn">Đặt lại mật khẩu →</a>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">Link này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu, vui lòng bỏ qua.</p>
        `),
        text: `Đặt lại mật khẩu: ${data.resetLink} (hết hạn sau 1 giờ)`,
    };
}
