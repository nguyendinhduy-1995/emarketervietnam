import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata = {
    title: 'Đặt lịch hẹn | eMarketer Spa',
    description: 'Hệ thống đặt lịch trực tuyến',
};

export default function BookingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={inter.className} style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <header style={{
                padding: '20px',
                textAlign: 'center',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ fontWeight: 700, fontSize: '20px', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    eMarketer Hub Booking
                </div>
            </header>

            <main style={{ flex: 1, padding: '40px 20px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>

            <footer style={{
                padding: '20px',
                textAlign: 'center',
                borderTop: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: '13px'
            }}>
                Powered by eMarketer Hub SaaS
            </footer>
        </div>
    );
}
