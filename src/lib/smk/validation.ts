// Phone validation (Vietnamese format)
export function isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-().]/g, '');
    return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(cleaned);
}

// Email validation
export function isValidEmail(email: string): boolean {
    if (!email) return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Name validation
export function isValidName(name: string): boolean {
    return name.trim().length >= 2;
}

// Address validation
export function isValidAddress(address: string): boolean {
    return address.trim().length >= 10;
}

// Partner code validation (3-10 alphanumeric chars)
export function isValidPartnerCode(code: string): boolean {
    if (!code) return true; // optional
    return /^[A-Za-z0-9]{3,10}$/.test(code);
}

// Bank account validation
export function isValidBankAccount(account: string): boolean {
    if (!account) return true;
    return /^\d{6,20}$/.test(account.replace(/\s/g, ''));
}

// Error messages
export const VALIDATION_MESSAGES = {
    name: 'Vui lòng nhập họ tên (ít nhất 2 ký tự)',
    phone: 'Số điện thoại không hợp lệ (VD: 0912345678)',
    email: 'Email không đúng định dạng',
    address: 'Địa chỉ quá ngắn (ít nhất 10 ký tự)',
    partnerCode: 'Mã đối tác: 3-10 ký tự, chỉ chữ và số',
    bankAccount: 'Số tài khoản: 6-20 chữ số',
};
