'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Service { id: string; name: string; durationMin: number; price: number; category: string | null; }

export default function PublicBookingPage() {
    const { spaSlug } = useParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [spaInfo, setSpaInfo] = useState<{ name: string; orgName: string } | null>(null);
    const [services, setServices] = useState<Service[]>([]);

    const [step, setStep] = useState(1);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');

    const [form, setForm] = useState({ name: '', phone: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);

    useEffect(() => {
        fetch(`/api/public/book/${spaSlug}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
                setSpaInfo(data.spa);
                setServices(data.services || []);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [spaSlug]);

    const groupedServices = services.reduce<Record<string, Service[]>>((acc, svc) => {
        const cat = svc.category || 'Dịch vụ khác';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(svc);
        return acc;
    }, {});

    // Generate simple time slots (e.g. 09:00 to 20:00 every 30 mins)
    const timeSlots = [];
    for (let i = 9; i <= 19; i++) {
        timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${i.toString().padStart(2, '0')}:30`);
    }

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService || !bookingDate || !bookingTime || !form.name || !form.phone) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/public/book/${spaSlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: selectedService.id,
                    date: bookingDate,
                    time: bookingTime,
                    customerName: form.name,
                    customerPhone: form.phone,
                    notes: form.notes
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Đặt lịch thất bại');

            setSuccessData(data);
            setStep(4);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>;

    if (error) return (
        <div className="card" style={{ textAlign: 'center', padding: '40px', borderColor: 'var(--danger)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚫</div>
            <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>Không thể đặt lịch</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
    );

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>{spaInfo?.name}</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Thuộc {spaInfo?.orgName} • Đặt lịch trực tuyến</p>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Progress bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            flex: 1, padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600,
                            color: step === i ? 'var(--text-primary)' : 'var(--text-muted)',
                            borderBottom: step === i ? '2px solid var(--brand-primary)' : '2px solid transparent'
                        }}>
                            {i}. {i === 1 ? 'Chọn dịch vụ' : i === 2 ? 'Lịch hẹn' : 'Thông tin'}
                        </div>
                    ))}
                </div>

                <div style={{ padding: '32px' }}>
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>1. Bạn muốn làm dịch vụ gì?</h2>
                            {services.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Spa chưa có dịch vụ nào đang hoạt động.</div>
                            ) : (
                                Object.entries(groupedServices).map(([cat, svcs]) => (
                                    <div key={cat} style={{ marginBottom: '32px' }}>
                                        <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>{cat}</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {svcs.map(svc => (
                                                <div key={svc.id}
                                                    onClick={() => { setSelectedService(svc); handleNext(); }}
                                                    style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '16px', borderRadius: '12px', cursor: 'pointer',
                                                        border: selectedService?.id === svc.id ? '2px solid var(--brand-primary)' : '1px solid var(--border)',
                                                        background: selectedService?.id === svc.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{svc.name}</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>⏱ {svc.durationMin} phút</div>
                                                    </div>
                                                    <div style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
                                                        {svc.price.toLocaleString('vi-VN')}₫
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                <button onClick={handleBack} className="btn btn-secondary btn-sm">← Quay lại</button>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>2. Chọn thời gian rảnh</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Dịch vụ: <strong>{selectedService?.name}</strong></p>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label className="form-label">Chọn ngày đến Spa</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={bookingDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setBookingDate(e.target.value)}
                                />
                            </div>

                            {bookingDate && (
                                <div>
                                    <label className="form-label">Chọn khung giờ</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {timeSlots.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setBookingTime(time)}
                                                style={{
                                                    padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500,
                                                    border: bookingTime === time ? '2px solid var(--brand-primary)' : '1px solid var(--border)',
                                                    background: bookingTime === time ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                    color: bookingTime === time ? 'var(--brand-primary)' : 'var(--text-primary)',
                                                }}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '32px', textAlign: 'right' }}>
                                <button
                                    onClick={handleNext}
                                    disabled={!bookingDate || !bookingTime}
                                    className="btn btn-primary"
                                >
                                    Tiếp tục →
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                <button type="button" onClick={handleBack} className="btn btn-secondary btn-sm">← Quay lại</button>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>3. Điền thông tin cá nhân</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                        Ngày {new Date(bookingDate).toLocaleDateString('vi-VN')} lúc {bookingTime}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-2" style={{ gap: '20px' }}>
                                <div className="form-group">
                                    <label className="form-label">Họ và Tên *</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="VD: Nguyễn Văn A" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Số điện thoại *</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required placeholder="09xxxxxxx" />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '20px' }}>
                                <label className="form-label">Ghi chú thêm (không bắt buộc)</label>
                                <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Yêu cầu riêng về nhân viên, tình trạng da..." />
                            </div>

                            <div style={{ marginTop: '32px', textAlign: 'right' }}>
                                <button type="submit" disabled={submitting || !form.name || !form.phone} className="btn btn-primary" style={{ width: '100%' }}>
                                    {submitting ? 'Đang xử lý...' : 'Xác nhận Bật lịch ngay!'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 4 && successData && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
                            <h2 style={{ fontSize: '24px', color: 'var(--success)', marginBottom: '16px' }}>Đặt lịch thành công!</h2>
                            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
                                Cảm ơn <strong>{form.name}</strong>. Hẹn gặp bạn vào lúc:<br />
                                <strong style={{ fontSize: '20px', color: 'var(--text-primary)', display: 'block', marginTop: '12px' }}>
                                    {new Date(successData.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày {new Date(successData.startAt).toLocaleDateString('vi-VN')}
                                </strong>
                            </p>
                            <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '12px', display: 'inline-block', textAlign: 'left' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Dịch vụ đã chọn:</div>
                                <div style={{ fontWeight: 600 }}>{successData.serviceName}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
