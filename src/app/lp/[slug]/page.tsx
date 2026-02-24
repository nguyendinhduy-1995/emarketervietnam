import { notFound } from 'next/navigation';
import { getLandingConfig } from '@/lib/landing-config';
import LandingTemplate from '@/components/LandingTemplate';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const config = getLandingConfig(slug);
    if (!config) return {};
    return { title: config.ogTitle, description: config.ogDescription };
}

export default async function LandingPage({ params }: Props) {
    const { slug } = await params;
    const config = getLandingConfig(slug);
    if (!config) notFound();
    return <LandingTemplate config={config} />;
}
