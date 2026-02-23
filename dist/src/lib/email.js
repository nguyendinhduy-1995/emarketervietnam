"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.renderRenewalReminder = renderRenewalReminder;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
async function sendEmail(options) {
    // In development, log to console
    if (!process.env.SMTP_USER) {
        console.log('[EMAIL] To:', options.to);
        console.log('[EMAIL] Subject:', options.subject);
        console.log('[EMAIL] Body:', options.html.substring(0, 200));
        return true;
    }
    try {
        await transporter.sendMail(Object.assign({ from: `"eMarketer Hub" <${process.env.SMTP_USER}>` }, options));
        return true;
    }
    catch (error) {
        console.error('[EMAIL] Failed to send:', error);
        return false;
    }
}
function renderRenewalReminder(data) {
    const isOverdue = data.daysUntilExpiry < 0;
    const subject = isOverdue
        ? `⚠️ Gói ${data.planName} của ${data.workspaceName} đã hết hạn`
        : `🔔 Gói ${data.planName} sắp hết hạn trong ${data.daysUntilExpiry} ngày`;
    return {
        to: '',
        subject,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xin chào!</h2>
        <p>${isOverdue
            ? `Gói <strong>${data.planName}</strong> của workspace <strong>${data.workspaceName}</strong> đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng các module trả phí.`
            : `Gói <strong>${data.planName}</strong> của workspace <strong>${data.workspaceName}</strong> sẽ hết hạn trong <strong>${data.daysUntilExpiry} ngày</strong>.`}</p>
        <p><a href="${data.renewUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;">Gia hạn ngay</a></p>
        <p style="color:#666;font-size:12px;">eMarketer Hub – emarketervietnam.vn</p>
      </div>
    `,
    };
}
