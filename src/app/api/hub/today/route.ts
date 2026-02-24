import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { spaDb } from '@/lib/db/spa';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    try {
        // Get user's workspaces
        const memberships = await platformDb.membership.findMany({
            where: { userId: user.userId },
            include: { workspace: true },
        });

        const workspaces = memberships.map(m => ({
            id: m.workspace.id,
            name: m.workspace.name,
            slug: m.workspace.slug,
            status: m.workspace.status,
            role: m.role,
        }));

        // Check onboarding status
        const hasCompletedOnboarding = workspaces.length > 0;

        // Gather stats from first workspace (if any)
        const wsId = await resolveWorkspaceId(req, user);
        let tasks: Array<{ id: string; icon: string; title: string; subtitle: string; action: string; priority: 'high' | 'medium' | 'low' }> = [];
        let alerts: Array<{ id: string; type: 'danger' | 'warning'; message: string }> = [];
        let kpi = { label: 'Tiến độ hôm nay', current: 0, target: 0, percent: 0 };

        if (wsId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Appointments today
            const todayAppointments = await spaDb.appointment.findMany({
                where: {
                    workspaceId: wsId,
                    startAt: { gte: today, lt: tomorrow },
                },
                include: { customer: true, service: true },
                orderBy: { startAt: 'asc' },
                take: 5,
            });

            const pendingAppts = todayAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED');
            pendingAppts.slice(0, 3).forEach(a => {
                const time = new Date(a.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                tasks.push({
                    id: `appt-${a.id}`,
                    icon: '📅',
                    title: `${a.customer.name} – ${a.service.name}`,
                    subtitle: `Lúc ${time}`,
                    action: 'call',
                    priority: 'high',
                });
            });

            // Recent customers without appointments (follow-up)
            const recentCustomers = await spaDb.customer.findMany({
                where: { workspaceId: wsId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });

            const customersWithAppts = new Set(todayAppointments.map(a => a.customerId));
            const needFollowUp = recentCustomers.filter(c => !customersWithAppts.has(c.id));
            if (tasks.length < 3 && needFollowUp.length > 0) {
                needFollowUp.slice(0, 3 - tasks.length).forEach(c => {
                    tasks.push({
                        id: `followup-${c.id}`,
                        icon: '📞',
                        title: `Liên hệ lại ${c.name}`,
                        subtitle: c.phone || 'Chưa có SĐT',
                        action: 'call',
                        priority: 'medium',
                    });
                });
            }

            // Alerts
            // 1. Check subscription status
            const subscription = await platformDb.subscription.findFirst({
                where: { workspaceId: wsId },
                orderBy: { createdAt: 'desc' },
            });

            if (subscription) {
                if (subscription.status === 'PAST_DUE') {
                    alerts.push({
                        id: 'sub-overdue',
                        type: 'danger',
                        message: 'Gói dịch vụ đã hết hạn. Gia hạn để tiếp tục sử dụng.',
                    });
                } else if (subscription.currentPeriodEnd) {
                    const daysLeft = Math.ceil(
                        (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    if (daysLeft <= 7 && daysLeft > 0) {
                        alerts.push({
                            id: 'sub-expiring',
                            type: 'warning',
                            message: `Còn ${daysLeft} ngày dùng thử. Nâng cấp sớm!`,
                        });
                    }
                }
            }

            // 2. Check recent errors
            const recentErrors = await platformDb.errorLog.count({
                where: {
                    workspaceId: wsId,
                    createdAt: { gte: today },
                },
            });

            if (recentErrors > 0) {
                alerts.push({
                    id: 'errors-today',
                    type: 'warning',
                    message: `${recentErrors} lỗi hệ thống hôm nay. Kiểm tra nhật ký.`,
                });
            }

            // KPI: completed appointments / total appointments today
            const completedAppts = todayAppointments.filter(a => a.status === 'COMPLETED').length;
            kpi = {
                label: 'Lịch hẹn hoàn thành',
                current: completedAppts,
                target: todayAppointments.length,
                percent: todayAppointments.length > 0
                    ? Math.round((completedAppts / todayAppointments.length) * 100)
                    : 0,
            };
        }

        // If no tasks at all, provide onboarding tasks
        if (tasks.length === 0 && !hasCompletedOnboarding) {
            tasks = [
                { id: 'onboard-1', icon: '🚀', title: 'Thiết lập không gian làm việc', subtitle: 'Chỉ 2 phút', action: 'navigate', priority: 'high' },
            ];
        } else if (tasks.length === 0) {
            tasks = [
                { id: 'empty', icon: '🎉', title: 'Tuyệt vời! Hết việc rồi', subtitle: 'Quay lại sau nhé', action: 'none', priority: 'low' },
            ];
        }

        return NextResponse.json({
            tasks,
            alerts: alerts.slice(0, 3),
            kpi,
            workspaces,
            hasCompletedOnboarding,
        });
    } catch (error) {
        console.error('Today API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
