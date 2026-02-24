import { NextResponse } from 'next/server';

const CHANGELOG = [
    {
        version: '1.2.0',
        date: '2026-02-23',
        title: 'Phase 2 – Marketplace & Nâng cấp',
        items: [
            { type: 'feature', text: 'Marketplace nhóm theo mục tiêu kinh doanh' },
            { type: 'feature', text: 'Thanh đếm ngược dùng thử + nút nâng cấp' },
            { type: 'feature', text: 'Quản lý vai trò thành viên (đổi role, xoá)' },
        ],
    },
    {
        version: '1.1.0',
        date: '2026-02-23',
        title: 'Phase 1 – Nền tảng Hub mới',
        items: [
            { type: 'feature', text: 'Thanh điều hướng 4 tab mới' },
            { type: 'feature', text: 'Bảng tổng quan hành động (Today Dashboard)' },
            { type: 'feature', text: 'Hộp thư công việc (Task Inbox)' },
            { type: 'feature', text: 'Onboarding 2 phút với dữ liệu mẫu' },
            { type: 'feature', text: 'Trung tâm dữ liệu 3 tab (nhập/lịch sử/mẫu)' },
            { type: 'feature', text: 'Nhật ký hoạt động dạng timeline' },
            { type: 'feature', text: 'Trang sức khoẻ hệ thống' },
            { type: 'feature', text: 'Cài đặt nâng cấp (hồ sơ, mật khẩu, team)' },
            { type: 'feature', text: 'Hệ thống thông báo Toast' },
        ],
    },
    {
        version: '1.0.0',
        date: '2026-02-22',
        title: 'Ra mắt MVP',
        items: [
            { type: 'feature', text: 'Hub Platform với đăng nhập, đăng ký' },
            { type: 'feature', text: 'Spa CRM: Khách hàng, Dịch vụ, Lịch hẹn, Hoá đơn' },
            { type: 'feature', text: 'Marketplace modules & Thanh toán QR' },
            { type: 'feature', text: 'PWA hỗ trợ offline' },
        ],
    },
];

export async function GET() {
    return NextResponse.json({ changelog: CHANGELOG });
}
