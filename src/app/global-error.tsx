'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service like Sentry in production
        console.error('Global Error Boundary caught an error:', error);
    }, [error]);

    return (
        <html lang="vi">
            <body>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    fontFamily: 'system-ui, sans-serif',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
                        Đã có lỗi hệ thống xảy ra
                    </h1>
                    <p style={{ color: '#666', marginBottom: '24px' }}>
                        Rất xin lỗi vì sự bất tiện này. Đội ngũ kỹ thuật đã được thông báo.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#000',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        Thử lại
                    </button>
                </div>
            </body>
        </html>
    );
}
