'use client';

/**
 * MiniChart — lightweight SVG bar/line chart with no dependencies
 */

interface MiniChartProps {
    data: number[];
    labels?: string[];
    type?: 'bar' | 'line';
    color?: string;
    height?: number;
    showValues?: boolean;
}

export default function MiniChart({
    data,
    labels = [],
    type = 'bar',
    color = '#d4a853',
    height = 120,
    showValues = true,
}: MiniChartProps) {
    if (data.length === 0) return null;

    const max = Math.max(...data, 1);
    const width = 100; // percentage-based
    const padding = { top: 10, bottom: showValues ? 24 : 8, left: 4, right: 4 };
    const chartH = height - padding.top - padding.bottom;
    const barWidth = (width - padding.left - padding.right) / data.length;

    if (type === 'line') {
        const points = data.map((v, i) => {
            const x = padding.left + (i / (data.length - 1 || 1)) * (width - padding.left - padding.right);
            const y = padding.top + chartH - (v / max) * chartH;
            return `${x},${y}`;
        }).join(' ');

        const areaPoints = `${padding.left},${padding.top + chartH} ${points} ${padding.left + (width - padding.left - padding.right)},${padding.top + chartH}`;

        return (
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <polygon points={areaPoints} fill="url(#lineGradient)" />
                <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {data.map((v, i) => {
                    const x = padding.left + (i / (data.length - 1 || 1)) * (width - padding.left - padding.right);
                    const y = padding.top + chartH - (v / max) * chartH;
                    return <circle key={i} cx={x} cy={y} r="2" fill={color} />;
                })}
            </svg>
        );
    }

    // Bar chart
    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
            <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor={color} stopOpacity="0.4" />
                </linearGradient>
            </defs>
            {data.map((v, i) => {
                const x = padding.left + i * barWidth + barWidth * 0.15;
                const w = barWidth * 0.7;
                const barH = (v / max) * chartH;
                const y = padding.top + chartH - barH;
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={w} height={barH} rx="2" fill="url(#barGradient)" />
                        {showValues && labels[i] && (
                            <text x={x + w / 2} y={height - 4} textAnchor="middle" fontSize="5" fill="var(--text-muted, #888)">{labels[i]}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
