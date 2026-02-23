'use client';
import { useEffect, useState } from 'react';

export default function AdminBillingPage() {
    const [orders, setOrders] = useState<Array<{
        id: string; orderCode: string; workspaceId: string; amount: number; status: string; createdAt: string;
    }>>([]);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        // Reuse orders endpoint - admin can see all via admin API
        // For now, show a placeholder with manual confirm UI
        setOrders([]);
    }, []);

    const handleConfirm = async (orderId: string) => {
        const res = await fetch(`/api/admin/orders/${orderId}/confirm`, { method: 'POST' });
        const data = await res.json();
        setMsg(data.message || data.error);
    };

    return (
        <div>
            <div className="page-header">
                <h1>💳 Billing Ops</h1>
                <p>Quản lý đơn hàng, giao dịch, và reconcile</p>
            </div>
            {msg && <div className="alert alert-success">{msg}</div>}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Xác nhận đơn hàng thủ công</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Nhập Order ID để xác nhận thanh toán khi CK sai nội dung hoặc thiếu tiền.
                </p>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    await handleConfirm(formData.get('orderId') as string);
                }} style={{ display: 'flex', gap: '12px' }}>
                    <input name="orderId" className="form-input" placeholder="Order ID (cuid)" required style={{ flex: 1 }} />
                    <button type="submit" className="btn btn-primary btn-sm">✅ Xác nhận</button>
                </form>
            </div>
            <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>Xem danh sách orders, transactions, và exception queue tại đây</p>
            </div>
        </div>
    );
}
