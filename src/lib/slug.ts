import { platformDb } from './db/platform';

const RESERVED_WORDS = new Set([
    'admin', 'api', 'login', 'signup', 'logout', 'register',
    'dashboard', 'billing', 'help', 'support', 'crm', 'spa',
    'www', 'mail', 'ftp', 'cdn', 'static', 'assets',
    'marketplace', 'modules', 'settings', 'profile', 'account',
    'webhook', 'webhooks', 'status', 'health', 'test',
]);

export function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .toLowerCase()
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
}

export function isReservedSlug(slug: string): boolean {
    return RESERVED_WORDS.has(slug);
}

export async function generateUniqueSlug(name: string): Promise<string> {
    let slug = slugify(name);
    if (!slug) slug = 'spa';

    if (isReservedSlug(slug)) {
        slug = `${slug}-spa`;
    }

    // Check uniqueness
    let candidate = slug;
    let attempt = 0;
    while (true) {
        const existing = await platformDb.workspace.findUnique({
            where: { slug: candidate },
        });
        if (!existing) return candidate;
        attempt++;
        candidate = `${slug}-${attempt}`;
    }
}
