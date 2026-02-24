import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

// GET /api/emk-crm/export?type=accounts|tasks|revenue&format=csv
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'accounts';
    const format = url.searchParams.get('format') || 'csv';

    try {
        let csvContent = '';
        let filename = '';

        switch (type) {
            case 'accounts': {
                const accounts = await platformDb.emkAccount.findMany({
                    orderBy: { createdAt: 'desc' },
                    include: { workspace: { select: { name: true, slug: true, product: true } } },
                });
                const headers = ['ID', 'Workspace', 'Slug', 'Ngành', 'Plan', 'Status', 'Trial End', 'Ngày tạo'];
                const rows = accounts.map(a => [
                    a.id, a.workspace?.name || '', a.workspace?.slug || '', a.workspace?.product || '',
                    a.plan, a.status,
                    a.trialEndAt ? new Date(a.trialEndAt).toLocaleDateString('vi-VN') : '',
                    new Date(a.createdAt).toLocaleDateString('vi-VN'),
                ]);
                csvContent = buildCsv(headers, rows);
                filename = `accounts_export_${dateStamp()}.csv`;
            }
            case 'tasks': {
                const tasks = await platformDb.emkTask.findMany({
                    orderBy: { createdAt: 'desc' },
                    include: {
                        owner: { select: { name: true } },
                        lead: { select: { name: true } },
                        account: { select: { workspace: { select: { name: true } } } },
                    },
                });
                const headers = ['ID', 'Title', 'Type', 'Status', 'Due Date', 'Owner', 'Lead', 'Account', 'Ngày tạo'];
                const rows = tasks.map(t => [
                    t.id, t.title, t.type, t.status,
                    t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : '',
                    t.owner?.name || '', t.lead?.name || '',
                    t.account?.workspace?.name || '',
                    new Date(t.createdAt).toLocaleDateString('vi-VN'),
                ]);
                csvContent = buildCsv(headers, rows);
                filename = `tasks_export_${dateStamp()}.csv`;
                break;
            }
            case 'revenue': {
                const payments = await platformDb.paymentTxn.findMany({
                    orderBy: { paidAt: 'desc' },
                    include: { workspace: { select: { name: true, slug: true } } },
                });
                const headers = ['ID', 'Workspace', 'Amount (VND)', 'Provider', 'Description', 'Paid At'];
                const rows = payments.map(p => [
                    p.id, p.workspace.name, p.amount.toString(), p.provider,
                    p.description || '', new Date(p.paidAt).toLocaleDateString('vi-VN'),
                ]);
                csvContent = buildCsv(headers, rows);
                filename = `revenue_export_${dateStamp()}.csv`;
                break;
            }
            default:
                return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
        }

        if (format === 'json') {
            return NextResponse.json({ csv: csvContent, filename });
        }

        // Return as downloadable CSV
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('[Export API]', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}

function buildCsv(headers: string[], rows: string[][]): string {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(',')];
    for (const row of rows) lines.push(row.map(escape).join(','));
    return '\uFEFF' + lines.join('\n'); // BOM for Excel UTF-8
}

function dateStamp(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
