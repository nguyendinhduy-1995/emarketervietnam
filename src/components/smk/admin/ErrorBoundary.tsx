'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, showDetails: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, showDetails: false };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    padding: 'var(--space-8)', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 'var(--space-4)', minHeight: 300, justifyContent: 'center',
                }}>
                    <div style={{ fontSize: 48 }}>⚠️</div>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Đã xảy ra lỗi
                    </h2>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', maxWidth: 400 }}>
                        Trang gặp sự cố. Vui lòng thử lại hoặc liên hệ quản trị viên.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => this.setState({ hasError: false, error: null })}
                            style={{ fontWeight: 600 }}
                        >
                            🔄 Thử lại
                        </button>
                        <button
                            className="btn"
                            onClick={() => this.setState(prev => ({ ...prev, showDetails: !prev.showDetails }))}
                            style={{ fontSize: 'var(--text-xs)' }}
                        >
                            {this.state.showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                        </button>
                    </div>
                    {this.state.showDetails && this.state.error && (
                        <pre style={{
                            marginTop: 'var(--space-3)', padding: 'var(--space-3)',
                            background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                            fontSize: 11, color: 'var(--error)', textAlign: 'left',
                            maxWidth: '100%', overflow: 'auto', whiteSpace: 'pre-wrap',
                        }}>
                            {this.state.error.message}
                            {'\n'}
                            {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
