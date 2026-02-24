import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { promises as fs } from 'fs';
import path from 'path';

// AI feature toggle definitions
export interface AiFeatureConfig {
    [key: string]: {
        enabled: boolean;
        name: string;
        description: string;
        layer: 'hub' | 'crm' | 'landing' | 'all';
        category: 'chat' | 'analytics' | 'intelligence' | 'content';
    };
}

const DEFAULT_CONFIG: AiFeatureConfig = {
    ai_chat_hub: {
        enabled: true,
        name: 'AI Chat – Hub',
        description: 'Chatbot AI trợ lý cho khách hàng trên Hub (hướng dẫn sử dụng, hỏi đáp)',
        layer: 'hub',
        category: 'chat',
    },
    ai_chat_crm: {
        enabled: true,
        name: 'AI Chat – CRM',
        description: 'Chatbot AI cho team nội bộ CRM (tóm tắt leads, viết email, gợi ý)',
        layer: 'crm',
        category: 'chat',
    },
    ai_summary: {
        enabled: true,
        name: 'AI Tóm tắt Dashboard',
        description: 'GPT phân tích tình hình KPIs và đề xuất hành động trên CRM Dashboard',
        layer: 'crm',
        category: 'intelligence',
    },
    analytics_landing: {
        enabled: true,
        name: 'Analytics – Landing',
        description: 'Thu thập dữ liệu hành vi visitor trên Landing pages (page views, scroll, clicks)',
        layer: 'landing',
        category: 'analytics',
    },
    analytics_hub: {
        enabled: true,
        name: 'Analytics – Hub',
        description: 'Thu thập dữ liệu hành vi khách hàng trên Hub (page views, navigation, CTAs)',
        layer: 'hub',
        category: 'analytics',
    },
    ai_lead_scoring: {
        enabled: true,
        name: 'AI Chấm điểm Lead',
        description: 'Tự động chấm điểm lead 0-100 dựa trên hành vi, nguồn, ngành, tương tác. Phân loại: Nóng/Ấm/Lạnh',
        layer: 'crm',
        category: 'intelligence',
    },
    ai_content_gen: {
        enabled: true,
        name: 'AI Tạo nội dung',
        description: 'Tự động tạo email, tin Zalo, kịch bản gọi điện dựa trên hồ sơ lead và trạng thái',
        layer: 'crm',
        category: 'content',
    },
    ai_churn_predictor: {
        enabled: true,
        name: 'AI Dự đoán Churn',
        description: 'Phân tích rủi ro churn dựa trên hoạt động, subscription, và đề xuất hành động giữ chân',
        layer: 'crm',
        category: 'intelligence',
    },
};

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-settings.json');

async function readConfig(): Promise<AiFeatureConfig> {
    try {
        const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
        const saved = JSON.parse(raw);
        // Merge with defaults (in case new features are added)
        const merged = { ...DEFAULT_CONFIG };
        for (const key of Object.keys(merged)) {
            if (saved[key] !== undefined) {
                merged[key] = { ...merged[key], enabled: saved[key].enabled };
            }
        }
        return merged;
    } catch {
        return DEFAULT_CONFIG;
    }
}

async function writeConfig(config: AiFeatureConfig) {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// GET – Admin reads all AI feature settings
export async function GET() {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const config = await readConfig();
    return Response.json({ features: config });
}

// PUT – Admin toggles features
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { featureKey, enabled } = await req.json();

    if (!featureKey || typeof enabled !== 'boolean') {
        return Response.json({ error: 'Thiếu featureKey hoặc enabled' }, { status: 400 });
    }

    const config = await readConfig();
    if (!config[featureKey]) {
        return Response.json({ error: 'Tính năng không tồn tại' }, { status: 404 });
    }

    config[featureKey].enabled = enabled;
    await writeConfig(config);

    return Response.json({ ok: true, feature: config[featureKey] });
}
