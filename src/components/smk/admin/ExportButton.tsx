'use client';

/**
 * ExportButton — CSV export from any data array
 * Usage: <ExportButton data={items} columns={cols} filename="customers" />
 */

interface ExportColumn {
    key: string;
    label: string;
    format?: (value: unknown) => string;
}

interface ExportButtonProps {
    data: Record<string, unknown>[];
    columns: ExportColumn[];
    filename: string;
    className?: string;
}

export default function ExportButton({ data, columns, filename, className }: ExportButtonProps) {
    const handleExport = () => {
        if (data.length === 0) return;

        const header = columns.map(c => c.label).join(',');
        const rows = data.map(row =>
            columns.map(c => {
                const val = row[c.key];
                const formatted = c.format ? c.format(val) : String(val ?? '');
                // Escape commas and quotes in CSV
                return formatted.includes(',') || formatted.includes('"')
                    ? `"${formatted.replace(/"/g, '""')}"`
                    : formatted;
            }).join(',')
        ).join('\n');

        const BOM = '\uFEFF'; // UTF-8 BOM for Excel Vietnamese support
        const blob = new Blob([BOM + header + '\n' + rows], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <button className={className || 'btn btn-sm'} onClick={handleExport} title="Xuất CSV"
            style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            📥 CSV
        </button>
    );
}
