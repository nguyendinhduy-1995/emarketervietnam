'use client';
import { useEffect, useState } from 'react';

interface TimelineGroup {
    [day: string]: Array<{ id: string; message: string; time: string; type: string }>;
}

export default function TimelinePage() {
    const [timeline, setTimeline] = useState<TimelineGroup>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/hub/timeline?limit=30')
            .then(r => r.json())
            .then(d => { setTimeline(d.timeline || {}); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Nhật ký hoạt động</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Mọi thay đổi gần đây</p>
            </div>

            {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="emk-skeleton" style={{ height: '48px' }} />
                ))
            ) : Object.keys(timeline).length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '48px 24px', borderRadius: '20px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                    <p style={{ fontWeight: 600 }}>Chưa có hoạt động nào</p>
                </div>
            ) : (
                Object.entries(timeline).map(([day, entries]) => (
                    <section key={day}>
                        <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            {day}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {entries.map(e => (
                                <div key={e.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 14px', borderRadius: '12px',
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                }}>
                                    <span style={{ fontSize: '14px', flex: 1 }}>{e.message}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '12px' }}>{e.time}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
