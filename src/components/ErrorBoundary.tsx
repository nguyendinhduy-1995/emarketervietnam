'use client';
import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
        // Could log to /api/errors here
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '60px 24px', textAlign: 'center', minHeight: '300px',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>Đã xảy ra lỗi</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 20px', maxWidth: '400px', lineHeight: 1.6 }}>
                        {this.state.error?.message || 'Một lỗi không mong muốn đã xảy ra. Vui lòng thử lại.'}
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                        style={{
                            padding: '12px 24px', borderRadius: '12px', border: 'none',
                            background: 'var(--accent-primary)', color: 'white', fontWeight: 700,
                            fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        🔄 Tải lại trang
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
