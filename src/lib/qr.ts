import QRCode from 'qrcode';

interface BankTransferInfo {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    amount: number;
    content: string; // EMK-XXXXXX
}

/**
 * Generate QR code as data URL for bank transfer.
 * Uses VietQR format for Vietnamese banks.
 */
export async function generatePaymentQR(info: BankTransferInfo): Promise<string> {
    const qrContent = [
        `Bank: ${info.bankName}`,
        `STK: ${info.accountNumber}`,
        `Chu TK: ${info.accountHolder}`,
        `So tien: ${info.amount.toLocaleString('vi-VN')} VND`,
        `Noi dung CK: ${info.content}`,
    ].join('\n');

    return QRCode.toDataURL(qrContent, {
        width: 300,
        margin: 2,
        color: {
            dark: '#1a1a2e',
            light: '#ffffff',
        },
    });
}

/**
 * Generate order code: EMK-XXXXXX
 */
export function generateOrderCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `EMK-${code}`;
}
