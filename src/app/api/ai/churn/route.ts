import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

// GET – Dự đoán khách hàng sắp rời bỏ
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    // Lấy tất cả accounts có workspace
    const accounts = await platformDb.emkAccount.findMany({
        include: {
            workspace: {
                select: {
                    id: true, name: true, status: true, createdAt: true,
                    subscriptions: {
                        select: { status: true, currentPeriodEnd: true },
                        orderBy: { currentPeriodEnd: 'desc' },
                        take: 1,
                    },
                    eventLogs: {
                        select: { createdAt: true },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            },
        },
    });

    const now = new Date();
    const predictions: Array<{
        id: string;
        name: string;
        riskScore: number;
        riskLabel: string;
        riskColor: string;
        reasons: string[];
        suggestion: string;
        lastActivity: Date | null;
        subscriptionEnd: Date | null;
    }> = [];

    for (const account of accounts) {
        const ws = account.workspace;
        if (!ws) continue;

        let riskScore = 0;
        const reasons: string[] = [];

        // 1. Trạng thái workspace
        if (ws.status === 'SUSPENDED') {
            riskScore += 40;
            reasons.push('Tài khoản đã bị tạm dừng');
        }

        // 2. Subscription sắp hết
        const sub = ws.subscriptions[0];
        if (sub) {
            if (sub.status === 'PAST_DUE') {
                riskScore += 30;
                reasons.push('Đã quá hạn thanh toán');
            }
            if (sub.currentPeriodEnd) {
                const daysLeft = Math.ceil(
                    (new Date(sub.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysLeft <= 3) {
                    riskScore += 25;
                    reasons.push(`Gói hết hạn trong ${daysLeft} ngày`);
                } else if (daysLeft <= 7) {
                    riskScore += 15;
                    reasons.push(`Gói hết hạn trong ${daysLeft} ngày`);
                }
            }
        } else {
            riskScore += 10;
            reasons.push('Chưa đăng ký gói dịch vụ');
        }

        // 3. Hoạt động gần đây
        const lastEvent = ws.eventLogs[0];
        if (lastEvent) {
            const daysSinceActivity = Math.ceil(
                (now.getTime() - new Date(lastEvent.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceActivity > 30) {
                riskScore += 30;
                reasons.push(`Không hoạt động ${daysSinceActivity} ngày`);
            } else if (daysSinceActivity > 14) {
                riskScore += 20;
                reasons.push(`Không hoạt động ${daysSinceActivity} ngày`);
            } else if (daysSinceActivity > 7) {
                riskScore += 10;
                reasons.push(`Ít hoạt động gần đây (${daysSinceActivity} ngày)`);
            }
        } else {
            riskScore += 25;
            reasons.push('Chưa có hoạt động nào');
        }

        // 4. Tuổi tài khoản (mới quá → dễ bỏ)
        const accountAge = Math.ceil(
            (now.getTime() - new Date(ws.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (accountAge < 7 && !sub) {
            riskScore += 15;
            reasons.push('Tài khoản mới, chưa cam kết');
        }

        // Giới hạn 0-100
        riskScore = Math.max(0, Math.min(100, riskScore));

        // Phân loại
        let riskLabel: string;
        let riskColor: string;
        if (riskScore >= 60) { riskLabel = 'Cao'; riskColor = '#ef4444'; }
        else if (riskScore >= 30) { riskLabel = 'Trung bình'; riskColor = '#f59e0b'; }
        else { riskLabel = 'Thấp'; riskColor = '#22c55e'; }

        // Đề xuất hành động
        let suggestion: string;
        if (riskScore >= 60) {
            suggestion = 'Gọi điện ngay! Tìm hiểu nguyên nhân và đề xuất ưu đãi giữ chân.';
        } else if (riskScore >= 30) {
            suggestion = 'Gửi email/Zalo nhắc nhở và giới thiệu tính năng mới.';
        } else {
            suggestion = 'Tiếp tục chăm sóc định kỳ, không cần hành động khẩn cấp.';
        }

        predictions.push({
            id: account.id,
            name: ws.name,
            riskScore,
            riskLabel,
            riskColor,
            reasons,
            suggestion,
            lastActivity: lastEvent?.createdAt || null,
            subscriptionEnd: sub?.currentPeriodEnd || null,
        });
    }

    // Sắp xếp theo risk cao nhất
    predictions.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({
        predictions,
        stats: {
            high: predictions.filter(p => p.riskScore >= 60).length,
            medium: predictions.filter(p => p.riskScore >= 30 && p.riskScore < 60).length,
            low: predictions.filter(p => p.riskScore < 30).length,
            total: predictions.length,
        },
    });
}
