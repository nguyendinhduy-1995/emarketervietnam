'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { MODULE_KEYS } from '@/lib/constants';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AiSuitePage() {
    const { spaSlug } = useParams();
    const [hasEntitlement, setHasEntitlement] = useState<boolean | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        fetch('/api/subscription')
            .then((r) => r.json())
            .then((d) => {
                const ents = d.entitlements || [];
                const hasAi = ents.some(
                    (e: any) => e.moduleKey === MODULE_KEYS.AI_SUITE && e.status === 'ACTIVE'
                );
                setHasEntitlement(hasAi);
            });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (hasEntitlement === null) {
        return <div style={{ padding: '60px', textAlign: 'center' }}><div className="loading-spinner" /></div>;
    }

    if (!hasEntitlement) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                <h2>Module Trợ lý AI chưa được kích hoạt</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Nâng cấp module AI Suite và cấu hình API Key trong mục AI Vault (Hub Portal) để sử dụng trợ lý ảo thông minh cho Spa của bạn.
                </p>
                <Link href="/marketplace" className="btn btn-primary">
                    Khám phá Hub Marketplace
                </Link>
                <br />
                <Link href="/ai-vault" className="btn btn-secondary" style={{ marginTop: '16px', display: 'inline-block' }}>
                    Cấu hình AI Vault
                </Link>
            </div>
        );
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`/api/crm/${spaSlug}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMsg] }),
            });

            const data = await res.json();
            if (res.ok && data.message) {
                setMessages((prev) => [...prev, data.message as Message]);
            } else {
                setMessages((prev) => [...prev, { role: 'assistant', content: `Lỗi: ${data.error || 'Không thể kết nối tới AI Provider.'}` }]);
            }
        } catch (error) {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Lỗi kết nối mạng.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <div className="page-header" style={{ marginBottom: '16px' }}>
                <h1>🤖 Trợ lý AI Spa Assistant</h1>
                <p>Chat với AI để xin tư vấn kịch bản chốt sale, chăm sóc da, hoặc xử lý khiếu nại.</p>
            </div>

            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                {/* Chat History */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f8fafc' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✨</div>
                            <p>Hãy bắt đầu cuộc trò chuyện!</p>
                            <p style={{ fontSize: '14px' }}>Ví dụ: "Viết thiệp cảm ơn sinh nhật khách hàng", "Kịch bản tư vấn liệu trình mụn"</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {messages.map((m, idx) => (
                                <div key={idx} style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    backgroundColor: m.role === 'user' ? 'var(--primary-color)' : 'white',
                                    color: m.role === 'user' ? 'white' : 'var(--text-color)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    maxWidth: '80%',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    border: m.role === 'user' ? 'none' : '1px solid var(--border-color)',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {m.content}
                                </div>
                            ))}
                            {isLoading && (
                                <div style={{ alignSelf: 'flex-start', padding: '12px 16px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderTopColor: 'var(--primary-color)' }} />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Chat Input */}
                <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', backgroundColor: 'white' }}>
                    <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            placeholder="Hỏi AI bất kỳ điều gì..."
                            className="form-input"
                            style={{ flex: 1, marginBottom: 0 }}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                            Gửi 🚀
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
