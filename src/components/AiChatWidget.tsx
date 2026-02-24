'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AiChatWidgetProps {
    layer: 'hub' | 'crm';
    currentPage?: string;
    stats?: Record<string, unknown>;
}

export default function AiChatWidget({ layer, currentPage, stats }: AiChatWidgetProps) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Check if this feature is enabled
    useEffect(() => {
        const key = layer === 'hub' ? 'ai_chat_hub' : 'ai_chat_crm';
        fetch(`/api/ai/settings?keys=${key}`)
            .then(r => r.json())
            .then(d => setFeatureEnabled(d[key] !== false))
            .catch(() => setFeatureEnabled(true)); // default to enabled on error
    }, [layer]);

    // Load conversation from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`ai-chat-${layer}`);
        if (saved) {
            try { setMessages(JSON.parse(saved)); } catch { /* ignore */ }
        }
    }, [layer]);

    // Save to localStorage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`ai-chat-${layer}`, JSON.stringify(messages.slice(-20)));
        }
    }, [messages, layer]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    const sendMessage = useCallback(async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    context: { layer, currentPage, stats },
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${err.error || 'Lỗi kết nối'}` }]);
                setLoading(false);
                return;
            }

            // SSE streaming
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split('\n').filter(l => l.startsWith('data: '));

                for (const line of lines) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            assistantContent += parsed.content;
                            setMessages(prev => {
                                const updated = [...prev];
                                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                                return updated;
                            });
                        }
                    } catch { /* ignore parse errors */ }
                }
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Không thể kết nối AI. Thử lại sau.' }]);
        }
        setLoading(false);
    }, [input, loading, messages, layer, currentPage, stats]);

    const clearChat = () => {
        setMessages([]);
        localStorage.removeItem(`ai-chat-${layer}`);
    };

    const isHub = layer === 'hub';
    const accentColor = isHub ? 'var(--accent-primary)' : '#6366f1';

    // Don't render if feature is disabled or still loading settings
    if (featureEnabled === null || featureEnabled === false) return null;

    return (
        <>
            {/* FAB Button */}
            {!open && (
                <button onClick={() => setOpen(true)} style={{
                    position: 'fixed', bottom: isHub ? '80px' : '80px', right: '16px', zIndex: 9999,
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${accentColor}, #a855f7)`,
                    color: 'white', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', transition: 'transform 200ms ease',
                }} title="AI Trợ lý">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" /></svg>
                </button>
            )}

            {/* Chat Panel */}
            {open && (
                <div style={{
                    position: 'fixed', bottom: isHub ? '80px' : '80px', right: '16px', zIndex: 9999,
                    width: 'min(380px, calc(100vw - 32px))', height: 'min(520px, calc(100vh - 120px))',
                    borderRadius: '20px', overflow: 'hidden',
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: `linear-gradient(135deg, ${accentColor}, #a855f7)`,
                        color: 'white',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px', display: 'flex' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="var(--accent-primary)" /></svg></span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '14px' }}>AI Trợ lý</div>
                                <div style={{ fontSize: '11px', opacity: 0.85 }}>
                                    {isHub ? 'eMarketer Hub' : 'eMk-CRM'} • GPT-4o
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {messages.length > 0 && (
                                <button onClick={clearChat} style={{
                                    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
                                    padding: '6px 10px', cursor: 'pointer', color: 'white', fontSize: '11px',
                                    fontWeight: 600,
                                }}>Xóa</button>
                            )}
                            <button onClick={() => setOpen(false)} style={{
                                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
                                padding: '6px 10px', cursor: 'pointer', color: 'white', fontSize: '16px',
                            }}>✕</button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '12px',
                        display: 'flex', flexDirection: 'column', gap: '10px',
                    }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '36px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="var(--accent-primary)" /></svg></div>
                                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                                    Xin chào! Tôi là AI Trợ lý
                                </div>
                                <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                    Hỏi tôi bất kỳ điều gì về {isHub ? 'Hub' : 'CRM'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                                    {(isHub ? [
                                        '💡 Hướng dẫn thiết lập workspace',
                                        '📦 So sánh các gói dịch vụ',
                                        '📋 Cách nhập dữ liệu khách hàng',
                                    ] : [
                                        '📊 Tóm tắt tình hình đăng ký hôm nay',
                                        '✍️ Viết email chào khách mới',
                                        '🎯 User nào cần chăm sóc trước?',
                                    ]).map((suggestion, i) => (
                                        <button key={i} onClick={() => { setInput(suggestion.replace(/^[^ ]+ /, '')); }}
                                            style={{
                                                padding: '8px 12px', borderRadius: '10px', fontSize: '12px',
                                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                cursor: 'pointer', color: 'var(--text-secondary)', textAlign: 'left',
                                            }}>
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            }}>
                                <div style={{
                                    maxWidth: '85%', padding: '10px 14px', borderRadius: '14px',
                                    fontSize: '13px', lineHeight: 1.6,
                                    ...(msg.role === 'user' ? {
                                        background: accentColor, color: 'white',
                                        borderBottomRightRadius: '4px',
                                    } : {
                                        background: 'var(--bg-card)', color: 'var(--text-primary)',
                                        border: '1px solid var(--border)',
                                        borderBottomLeftRadius: '4px',
                                    }),
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                }}>
                                    {msg.content || (loading && i === messages.length - 1 ? (
                                        <span style={{ display: 'inline-flex', gap: '4px' }}>
                                            <span style={{ animation: 'blink 1.2s infinite' }}>●</span>
                                            <span style={{ animation: 'blink 1.2s 0.2s infinite' }}>●</span>
                                            <span style={{ animation: 'blink 1.2s 0.4s infinite' }}>●</span>
                                        </span>
                                    ) : '')}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '10px 12px', borderTop: '1px solid var(--border)',
                        display: 'flex', gap: '8px', background: 'var(--bg-secondary)',
                    }}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Hỏi AI trợ lý..."
                            disabled={loading}
                            style={{
                                flex: 1, padding: '10px 14px', borderRadius: '12px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit',
                                outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: input.trim() ? accentColor : 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                color: input.trim() ? 'white' : 'var(--text-muted)',
                                cursor: input.trim() ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '16px', flexShrink: 0,
                                transition: 'all 150ms ease',
                            }}
                        >
                            ↑
                        </button>
                    </div>

                    <style>{`@keyframes blink { 0%,100% { opacity: 0.3 } 50% { opacity: 1 } }`}</style>
                </div>
            )}
        </>
    );
}
