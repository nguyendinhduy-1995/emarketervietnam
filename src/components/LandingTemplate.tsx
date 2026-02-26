'use client';
import Link from 'next/link';
import RegisterForm from '@/components/RegisterForm';
import type { LandingConfig } from '@/lib/landing-config';

export default function LandingTemplate({ config }: { config: LandingConfig }) {
    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Top Bar */}
            <nav className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
                <Link href="/" className="font-bold text-lg" style={{ color: 'var(--accent-primary)' }}>eMarketer</Link>
                <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}>Đăng nhập</Link>
            </nav>

            {/* Hero */}
            <section className="px-4 py-16 text-center max-w-2xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
                    {config.heroTitle}
                </h1>
                <p className="text-lg md:text-xl mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {config.heroSubtitle}
                </p>
                <a href="#form" className="inline-block px-8 py-4 rounded-2xl font-semibold text-white text-lg shadow-lg transition-transform hover:scale-105"
                    style={{ background: 'var(--accent-primary)' }}>
                    {config.heroCtaLabel} →
                </a>
            </section>

            {/* Features */}
            <section className="px-4 py-12 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.features.map((f, i) => (
                        <div key={i} className="p-5 rounded-2xl transition-all hover:translate-y-[-2px]"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                            <span className="text-3xl mb-3 block">{f.icon}</span>
                            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Social Proof */}
            {config.proofItems && (
                <section className="px-4 py-8 text-center">
                    <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{config.proofTitle}</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {config.proofItems.map((p, i) => (
                            <div key={i} className="px-5 py-3 rounded-full text-sm font-medium"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent-primary)' }}>
                                ✓ {p}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Form */}
            <section id="form" className="px-4 py-16 max-w-lg mx-auto">
                <RegisterForm formTitle={config.formTitle} landingSlug={config.slug} />
            </section>

            {/* Footer */}
            <footer className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                © {new Date().getFullYear()} eMarketer Vietnam. Powered by AI.
            </footer>
        </div>
    );
}
