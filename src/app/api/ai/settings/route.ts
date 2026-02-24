import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-settings.json');

// Public GET – Landing/Hub checks if a feature is enabled
export async function GET(req: Request) {
    const url = new URL(req.url);
    const keys = url.searchParams.get('keys')?.split(',') || [];

    try {
        const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(raw);

        if (keys.length === 0) {
            // Return all enabled states
            const result: Record<string, boolean> = {};
            for (const [key, val] of Object.entries(config)) {
                result[key] = (val as { enabled: boolean }).enabled;
            }
            return Response.json(result);
        }

        // Return specific keys
        const result: Record<string, boolean> = {};
        for (const key of keys) {
            result[key] = config[key]?.enabled ?? true; // default enabled if not found
        }
        return Response.json(result);
    } catch {
        // No config file = all features enabled by default
        const result: Record<string, boolean> = {};
        for (const key of keys) {
            result[key] = true;
        }
        return Response.json(result);
    }
}
