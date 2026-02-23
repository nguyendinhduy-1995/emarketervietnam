'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Appointment {
    id: string; startAt: string; endAt: string; status: string; notes: string | null;
    customer: { id: string; name: string; phone: string | null };
    service: { id: string; name: string; durationMin: number; price: number };
}

export default function CrmAppointmentsPage() {
    const { spaSlug } = useParams();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetch(`/api/crm/${spaSlug}/appointments?date=${date}`).then(r => r.json()).then(d => setAppointments(d.appointments || []));
    }, [spaSlug, date]);

    const statusColor = (s: string) => {
        const m: Record<string, string> = {
            SCHEDULED: 'badge-info', CONFIRMED: 'badge-success', IN_PROGRESS: 'badge-warning',
            COMPLETED: 'badge-success', CANCELLED: 'badge-danger', NO_SHOW: 'badge-neutral',
        };
        return m[s] || 'badge-neutral';
    };

    return (
        <div>
            <div className="page-header">
                <h1>📅 Lịch hẹn</h1>
                <p>Quản lý lịch hẹn của khách hàng</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                <input type="date" className="form-input" style={{ width: '200px' }} value={date} onChange={e => setDate(e.target.value)} />
                <span style={{ color: 'var(--text-muted)' }}>{appointments.length} lịch hẹn</span>
            </div>

            {appointments.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📅</div><p>Không có lịch hẹn cho ngày này</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {appointments.map(apt => (
                        <div key={apt.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '80px', textAlign: 'center', flexShrink: 0 }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {new Date(apt.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {new Date(apt.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{apt.customer.name}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{apt.service.name} – {apt.service.durationMin} phút</div>
                                {apt.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{apt.notes}</div>}
                            </div>
                            <span className={`badge ${statusColor(apt.status)}`}>{apt.status}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
