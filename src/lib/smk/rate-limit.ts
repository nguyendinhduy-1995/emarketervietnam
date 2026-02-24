import { NextResponse } from 'next/server';

// Simple in-memory rate limiter per IP
const rateMap = new Map<string, { count: number; resetAt: number }>();
const API_RATE_LIMIT = 60; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_MAP_SIZE = 10000; // F1: Prevent memory exhaustion

export function rateLimit(ip: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = rateMap.get(ip);

    if (!entry || now > entry.resetAt) {
        // F1: Evict oldest entries if map is too large
        if (rateMap.size >= MAX_MAP_SIZE) {
            const firstKey = rateMap.keys().next().value;
            if (firstKey) rateMap.delete(firstKey);
        }
        rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true, remaining: API_RATE_LIMIT - 1 };
    }

    if (entry.count >= API_RATE_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    entry.count++;
    return { allowed: true, remaining: API_RATE_LIMIT - entry.count };
}

export function rateLimitResponse() {
    return NextResponse.json(
        { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
        {
            status: 429,
            headers: { 'Retry-After': '60' },
        }
    );
}

// Cleanup stale entries periodically (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateMap) {
        if (now > val.resetAt) rateMap.delete(key);
    }
}, 5 * 60 * 1000);
