'use client';
import { useEffect, useState, useCallback } from 'react';

// ══════════ TYPES ══════════
interface AiFeature {
    enabled: boolean;
    name: string;
    description: string;
    layer: 'hub' | 'crm' | 'landing' | 'all';
    category: 'chat' | 'analytics' | 'intelligence' | 'content' | 'automation';
    apiPath?: string;
}

interface AutoRule {
    id: string; name: string; enabled: boolean;
    trigger: { type: string; status?: string; days?: number };
    action: { type: string; taskTitle?: string; taskType?: string; dueDays?: number; newStatus?: string };
    lastRun?: string; matchCount: number;
}

interface RunResult { ruleId: string; ruleName: string; matched: number; actions: string[] }
interface ScoredLead { id: string; name: string; score: number; label: string; color: string; emoji: string; status: string; industry: string | null }

// ══════════ CONSTANTS ══════════
type TabKey = 'settings' | 'insights' | 'scoring' | 'writer' | 'automation' | 'drip' | 'messaging' | 'forecast' | 'cohort' | 'roi';
const TABS: { key: TabKey; icon: string; label: string }[] = [
    { key: 'settings', icon: '⚙️', label: 'Cài đặt' },
    { key: 'insights', icon: '🧠', label: 'Insights' },
    { key: 'scoring', icon: '🎯', label: 'Scoring' },
    { key: 'writer', icon: '✍️', label: 'AI Viết' },
    { key: 'automation', icon: '⚡', label: 'Auto' },
    { key: 'drip', icon: '📧', label: 'Drip' },
    { key: 'messaging', icon: '📱', label: 'Tin nhắn' },
    { key: 'forecast', icon: '📈', label: 'Dự báo' },
    { key: 'cohort', icon: '👥', label: 'Cohort' },
    { key: 'roi', icon: '💰', label: 'ROI' },
];

const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
    chat: { icon: '💬', label: 'Chat & Trợ lý', color: '#6366f1' },
    analytics: { icon: '📊', label: 'Phân tích', color: '#22c55e' },
    intelligence: { icon: '🧠', label: 'Trí tuệ AI', color: '#a855f7' },
    content: { icon: '✍️', label: 'Nội dung', color: '#f59e0b' },
    automation: { icon: '⚡', label: 'Automation', color: '#3b82f6' },
};

const LAYER_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    hub: { label: 'Hub', bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
    crm: { label: 'CRM', bg: 'rgba(168,85,247,0.1)', color: '#a855f7' },
    landing: { label: 'Landing', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
    all: { label: 'Tất cả', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
};

const DEFAULT_FEATURES: Record<string, AiFeature> = {
    ai_chat_hub: { enabled: true, name: 'AI Chat – Hub', description: 'Chatbot AI trợ lý cho khách hàng trên Hub', layer: 'hub', category: 'chat', apiPath: '/api/ai/chat' },
    ai_chat_crm: { enabled: true, name: 'AI Chat – CRM', description: 'Chatbot AI cho team nội bộ CRM', layer: 'crm', category: 'chat', apiPath: '/api/ai/chat' },
    ai_summary: { enabled: true, name: 'AI Tóm tắt Dashboard', description: 'GPT phân tích KPIs, phát hiện anomaly', layer: 'crm', category: 'intelligence', apiPath: '/api/ai/summary' },
    ai_insights: { enabled: true, name: 'Nhận định AI', description: 'GPT phân tích dữ liệu CRM, đưa ra 5 nhận định hành động hàng giờ', layer: 'crm', category: 'intelligence', apiPath: '/api/ai/insights' },
    analytics_landing: { enabled: true, name: 'Analytics – Landing', description: 'Tracking visitor trên Landing pages', layer: 'landing', category: 'analytics' },
    analytics_hub: { enabled: true, name: 'Analytics – Hub', description: 'Tracking hành vi khách hàng trên Hub', layer: 'hub', category: 'analytics' },
    ai_lead_scoring: { enabled: true, name: 'Chấm điểm tài khoản', description: 'Chấm điểm 0-100 và đánh giá khách hàng theo dữ liệu', layer: 'crm', category: 'intelligence', apiPath: '/api/ai/lead-score' },
    ai_content_gen: { enabled: true, name: 'AI Viết nội dung', description: 'GPT-4o-mini tạo email, Zalo, kịch bản từ hồ sơ tài khoản', layer: 'crm', category: 'content', apiPath: '/api/ai/generate' },
    ai_auto_tasks: { enabled: true, name: 'Tự động tạo việc', description: 'Tự động tạo công việc khi tài khoản thay đổi trạng thái', layer: 'crm', category: 'automation' },
    ai_pipeline_rules: { enabled: true, name: 'Tự động hóa quy trình', description: 'Quy tắc tự động xử lý tài khoản không hoạt động, chưa gán, có rủi ro', layer: 'crm', category: 'automation', apiPath: '/api/emk-crm/automation' },
    ai_churn_predictor: { enabled: true, name: 'Dự đoán rời bỏ', description: 'Phân tích rủi ro khách hàng rời bỏ, đề xuất giữ chân', layer: 'crm', category: 'intelligence', apiPath: '/api/ai/churn' },
    ai_360_view: { enabled: true, name: 'Khách hàng 360°', description: 'Dòng thời gian, chỉ số tương tác, hồ sơ tổng hợp', layer: 'crm', category: 'intelligence' },
};

const TRIGGER_VN: Record<string, string> = {
    'status_is': '📌 Trạng thái = ', 'lead_age': '⏰ Tài khoản > X ngày',
    'no_notes': '🔇 Không liên hệ > X ngày', 'unassigned': '👤 Chưa gán người phụ trách',
};
const ACTION_VN: Record<string, string> = {
    'create_task': '📋 Tạo công việc', 'change_status': '🔄 Đổi trạng thái',
    'assign_owner': '👤 Gán người phụ trách', 'add_tag': '🏷️ Thêm nhãn',
};

const STATUS_VN: Record<string, string> = {
    'NEW': 'Mới', 'CONTACTED': 'Đã liên hệ', 'ONBOARDING': 'Đang kích hoạt',
    'ACTIVE': 'Đang dùng', 'RENEWAL': 'Gia hạn', 'AT_RISK': 'Nguy cơ',
};

// ══════════ MAIN COMPONENT ══════════
export default function AiHubPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('settings');
    const [features, setFeatures] = useState<Record<string, AiFeature>>(DEFAULT_FEATURES);
    const [toggling, setToggling] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Insights state
    const [insights, setInsights] = useState<string[]>([]);
    const [insightsLoading, setInsightsLoading] = useState(false);

    // Scoring state
    const [scoredLeads, setScoredLeads] = useState<ScoredLead[]>([]);
    const [scoringLoading, setScoringLoading] = useState(false);
    const [scoringStats, setScoringStats] = useState<{ hot: number; warm: number; cold: number } | null>(null);

    // Writer state
    const [writerLeads, setWriterLeads] = useState<{ id: string; name: string; status: string }[]>([]);
    const [selectedLead, setSelectedLead] = useState('');
    const [aiType, setAiType] = useState<'email' | 'zalo' | 'call_script'>('email');
    const [aiTone, setAiTone] = useState('friendly');
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiCopied, setAiCopied] = useState(false);

    // Automation state
    const [autoRules, setAutoRules] = useState<AutoRule[]>([]);
    const [autoLoading, setAutoLoading] = useState(false);
    const [autoRunning, setAutoRunning] = useState(false);
    const [autoResults, setAutoResults] = useState<RunResult[] | null>(null);
    const [autoToggling, setAutoToggling] = useState<string | null>(null);

    // Forecast state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [forecastData, setForecastData] = useState<any>(null);
    const [forecastLoading, setForecastLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [cohortData, setCohortData] = useState<any[]>([]);
    const [cohortLoading, setCohortLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [roiData, setRoiData] = useState<any[]>([]);
    const [roiLoading, setRoiLoading] = useState(false);

    // Drip campaign state
    interface DripCampaign { id: string; name: string; description: string | null; triggerStatus: string; steps: { delay: number; subject: string; body: string; channel: string }[]; isActive: boolean; author: string; totalSent: number }
    const [dripCampaigns, setDripCampaigns] = useState<DripCampaign[]>([]);
    const [dripLoading, setDripLoading] = useState(false);
    const [dripCreating, setDripCreating] = useState(false);
    const [dripNewName, setDripNewName] = useState('');
    const [dripNewTrigger, setDripNewTrigger] = useState('NEW');
    const [dripNewSteps, setDripNewSteps] = useState<{ delay: number; subject: string; body: string; channel: string }[]>([]);
    const [dripGenerating, setDripGenerating] = useState(false);
    const [dripExecuting, setDripExecuting] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dripExecResults, setDripExecResults] = useState<any[] | null>(null);
    const [dripShowCreate, setDripShowCreate] = useState(false);

    // Messaging state
    interface MsgTemplate { id: string; name: string; channel: string; content: string }
    interface MsgHistoryItem { id: string; type: string; channel: string; content: string; status: string; sentAt: string }
    const [msgTemplates, setMsgTemplates] = useState<MsgTemplate[]>([]);
    const [msgHistory, setMsgHistory] = useState<MsgHistoryItem[]>([]);
    const [msgLoading, setMsgLoading] = useState(false);
    const [msgLeadId, setMsgLeadId] = useState('');
    const [msgChannel, setMsgChannel] = useState<'ZALO' | 'SMS' | 'EMAIL'>('ZALO');
    const [msgContent, setMsgContent] = useState('');
    const [msgSending, setMsgSending] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [msgLeadsList, setMsgLeadsList] = useState<any[]>([]);
    const [msgSentResult, setMsgSentResult] = useState<string | null>(null);

    // Load settings
    useEffect(() => {
        fetch('/api/emk-crm/ai-settings')
            .then(r => r.json())
            .then(d => {
                if (d.features && Object.keys(d.features).length > 0) {
                    const merged: Record<string, AiFeature> = {};
                    for (const [key, def] of Object.entries(DEFAULT_FEATURES)) {
                        merged[key] = { ...def, ...(d.features[key] || {}) };
                    }
                    setFeatures(merged);
                }
            })
            .catch((e) => { console.error(e); setError('Không thể tải cài đặt'); });
    }, []);

    const toggleFeature = useCallback(async (key: string, enabled: boolean) => {
        setToggling(key);
        try {
            await fetch('/api/emk-crm/ai-settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureKey: key, enabled }),
            });
            setFeatures(prev => ({ ...prev, [key]: { ...prev[key], enabled } }));
        } catch (e) { console.error(e); }
        setToggling(null);
    }, []);

    // Load insights
    const loadInsights = useCallback(() => {
        setInsightsLoading(true);
        fetch('/api/ai/insights')
            .then(r => r.json())
            .then(d => { setInsights(d.insights || []); setInsightsLoading(false); })
            .catch(() => setInsightsLoading(false));
    }, []);

    // Load scoring
    const loadScoring = useCallback(() => {
        setScoringLoading(true);
        fetch('/api/ai/lead-score')
            .then(r => r.json())
            .then(d => { setScoredLeads(d.leads || []); setScoringStats(d.stats || null); setScoringLoading(false); })
            .catch(() => setScoringLoading(false));
    }, []);

    // Load accounts for writer
    const loadWriterLeads = useCallback(() => {
        fetch('/api/emk-crm/accounts')
            .then(r => r.json())
            .then(d => setWriterLeads((d.accounts || []).map((a: { id: string; workspace: { name: string }; plan: string }) => ({ id: a.id, name: a.workspace?.name || 'N/A', status: a.plan }))))
            .catch(() => { });
    }, []);

    // Load automation rules
    const loadAutoRules = useCallback(() => {
        setAutoLoading(true);
        fetch('/api/emk-crm/automation')
            .then(r => r.json())
            .then(d => { setAutoRules(d.rules || []); setAutoLoading(false); })
            .catch(() => setAutoLoading(false));
    }, []);

    // Load forecast/cohort/roi
    const loadForecast = useCallback(() => {
        setForecastLoading(true);
        fetch('/api/ai/analytics?type=forecast')
            .then(r => r.json())
            .then(d => { setForecastData(d); setForecastLoading(false); })
            .catch(() => setForecastLoading(false));
    }, []);
    const loadCohort = useCallback(() => {
        setCohortLoading(true);
        fetch('/api/ai/analytics?type=cohort')
            .then(r => r.json())
            .then(d => { setCohortData(d.cohorts || []); setCohortLoading(false); })
            .catch(() => setCohortLoading(false));
    }, []);
    const loadRoi = useCallback(() => {
        setRoiLoading(true);
        fetch('/api/ai/analytics?type=roi')
            .then(r => r.json())
            .then(d => { setRoiData(d.channels || []); setRoiLoading(false); })
            .catch(() => setRoiLoading(false));
    }, []);
    const loadDripCampaigns = useCallback(() => {
        setDripLoading(true);
        fetch('/api/emk-crm/drip')
            .then(r => r.json())
            .then(d => { setDripCampaigns(d.campaigns || []); setDripLoading(false); })
            .catch(() => setDripLoading(false));
    }, []);

    // Load data on tab change
    useEffect(() => {
        if (activeTab === 'insights' && insights.length === 0) loadInsights();
        if (activeTab === 'scoring' && scoredLeads.length === 0) loadScoring();
        if (activeTab === 'writer' && writerLeads.length === 0) loadWriterLeads();
        if (activeTab === 'automation' && autoRules.length === 0) loadAutoRules();
        if (activeTab === 'forecast' && !forecastData) loadForecast();
        if (activeTab === 'cohort' && cohortData.length === 0) loadCohort();
        if (activeTab === 'roi' && roiData.length === 0) loadRoi();
        if (activeTab === 'drip' && dripCampaigns.length === 0) loadDripCampaigns();
        if (activeTab === 'messaging' && msgTemplates.length === 0) {
            setMsgLoading(true);
            fetch('/api/emk-crm/messaging')
                .then(r => r.json())
                .then(d => { setMsgTemplates(d.templates || []); setMsgLoading(false); })
                .catch(() => setMsgLoading(false));
            fetch('/api/emk-crm/accounts?limit=100')
                .then(r => r.json())
                .then(d => setMsgLeadsList((d.accounts || []).map((a: { id: string; workspace: { name: string } }) => ({ id: a.id, name: a.workspace?.name || 'N/A' }))))
                .catch(() => { });
        }
    }, [activeTab, insights.length, scoredLeads.length, writerLeads.length, autoRules.length, forecastData, cohortData.length, roiData.length, dripCampaigns.length, msgTemplates.length, loadInsights, loadScoring, loadWriterLeads, loadAutoRules, loadForecast, loadCohort, loadRoi, loadDripCampaigns]);

    // AI Writer generate
    const generateContent = async () => {
        if (!selectedLead) return;
        setAiGenerating(true); setAiResult(''); setAiCopied(false);
        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId: selectedLead, type: aiType, tone: aiTone, prompt: aiPrompt }),
            });
            const d = await res.json();
            setAiResult(d.content || d.error || 'Không có kết quả');
        } catch { setAiResult('Lỗi kết nối API'); }
        setAiGenerating(false);
    };

    // Automation actions
    const toggleAutoRule = async (ruleId: string) => {
        setAutoToggling(ruleId);
        await fetch('/api/emk-crm/automation', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle', ruleId }),
        });
        loadAutoRules(); setAutoToggling(null);
    };

    const runAutoAll = async () => {
        setAutoRunning(true); setAutoResults(null);
        const res = await fetch('/api/emk-crm/automation', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'run' }),
        });
        const data = await res.json();
        setAutoResults(data.results || []); setAutoRunning(false); loadAutoRules();
    };

    const enabledCount = Object.values(features).filter(f => f.enabled).length;
    const totalCount = Object.keys(features).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="var(--accent-primary)" /></svg>
                    AI Command Center
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Quản lý toàn bộ tính năng AI — {enabledCount}/{totalCount} đang bật
                </p>
            </div>

            {error && <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', color: '#ef4444', fontSize: '12px' }}>⚠️ {error}</div>}

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', borderRadius: '14px', padding: '4px', border: '1px solid var(--border)', overflowX: 'auto' }}>
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                        flex: 1, padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
                        background: activeTab === tab.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                        color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
                        transition: 'all 200ms',
                    }}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════ TAB: Settings ══════════ */}
            {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Overview stat */}
                    <div style={{
                        padding: '16px 20px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))',
                        border: '1px solid rgba(99,102,241,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>Tổng quan tính năng AI</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{enabledCount}/{totalCount} tính năng đang bật</div>
                        </div>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>{enabledCount}</div>
                    </div>

                    {/* Grouped features */}
                    {(() => {
                        const cats = new Map<string, [string, AiFeature][]>();
                        for (const [key, feat] of Object.entries(features)) {
                            if (!cats.has(feat.category)) cats.set(feat.category, []);
                            cats.get(feat.category)!.push([key, feat]);
                        }
                        return Array.from(cats.entries()).map(([cat, items]) => {
                            const meta = CATEGORY_META[cat] || { icon: '⚙️', label: cat, color: '#666' };
                            return (
                                <div key={cat}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>{meta.icon}</span> {meta.label}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {items.map(([key, feat]) => {
                                            const badge = LAYER_BADGE[feat.layer] || LAYER_BADGE.all;
                                            return (
                                                <div key={key} style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', opacity: feat.enabled ? 1 : 0.5, transition: 'all 200ms' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '13px' }}>{feat.name}</span>
                                                            <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '5px', background: badge.bg, color: badge.color, textTransform: 'uppercase' }}>{badge.label}</span>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{feat.description}</div>
                                                        {feat.apiPath && feat.enabled && <div style={{ fontSize: '10px', color: 'var(--accent-primary)', marginTop: '2px', fontFamily: 'monospace' }}>API: {feat.apiPath}</div>}
                                                    </div>
                                                    <button onClick={() => toggleFeature(key, !feat.enabled)} disabled={toggling === key} style={{
                                                        width: '48px', height: '26px', borderRadius: '13px', border: 'none',
                                                        background: feat.enabled ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--border)',
                                                        cursor: toggling === key ? 'wait' : 'pointer', position: 'relative', flexShrink: 0, transition: 'background 200ms',
                                                    }}>
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '10px', background: 'white', position: 'absolute', top: '3px', left: feat.enabled ? '25px' : '3px', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            {/* ══════════ TAB: AI Insights ══════════ */}
            {activeTab === 'insights' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>🧠 AI Insights — Phân tích CRM</h2>
                        <button onClick={loadInsights} disabled={insightsLoading} style={{
                            padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: 'none',
                            cursor: insightsLoading ? 'wait' : 'pointer', fontFamily: 'inherit',
                        }}>{insightsLoading ? '⏳' : '↻'} Làm mới</button>
                    </div>
                    {insightsLoading && insights.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px', animation: 'aiPulse 1.5s ease-in-out infinite' }}>🧠</div>
                            Đang phân tích dữ liệu CRM...
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {insights.map((insight, i) => (
                                <div key={i} style={{
                                    padding: '12px 16px', borderRadius: '12px',
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    fontSize: '13px', lineHeight: 1.6,
                                }}>{insight}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════ TAB: Lead Scoring ══════════ */}
            {activeTab === 'scoring' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>🎯 AI Lead Scoring</h2>
                        <button onClick={loadScoring} disabled={scoringLoading} style={{
                            padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'none',
                            cursor: scoringLoading ? 'wait' : 'pointer', fontFamily: 'inherit',
                        }}>{scoringLoading ? '⏳' : '↻'} Chấm lại</button>
                    </div>

                    {/* Stats */}
                    {scoringStats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {[
                                { label: '🟢 Nóng', value: scoringStats.hot, color: '#22c55e' },
                                { label: '🟡 Ấm', value: scoringStats.warm, color: '#f59e0b' },
                                { label: '🔴 Lạnh', value: scoringStats.cold, color: '#ef4444' },
                            ].map((s, i) => (
                                <div key={i} style={{ padding: '14px', borderRadius: '12px', textAlign: 'center', background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Lead list */}
                    {scoringLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ Đang chấm điểm...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {scoredLeads.map(lead => (
                                <div key={lead.id} style={{
                                    padding: '12px 16px', borderRadius: '12px',
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '12px',
                                        background: `${lead.color}12`, color: lead.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '16px', fontWeight: 800,
                                    }}>{lead.score}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{lead.emoji} {lead.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {STATUS_VN[lead.status] || lead.status} · {lead.industry || '—'}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: `${lead.color}12`, color: lead.color }}>{lead.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════ TAB: AI Writer ══════════ */}
            {activeTab === 'writer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>✍️ AI Content Writer</h2>

                    {/* Lead selector */}
                    <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)} style={{
                        padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)',
                        background: 'var(--bg-card)', fontSize: '13px', fontFamily: 'inherit',
                        color: 'var(--text-primary)',
                    }}>
                        <option value="">-- Chọn lead --</option>
                        {writerLeads.map(l => <option key={l.id} value={l.id}>{l.name} ({STATUS_VN[l.status] || l.status})</option>)}
                    </select>

                    {/* Type selector */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {([['email', '📧 Email'], ['zalo', '💬 Zalo'], ['call_script', '📞 Kịch bản']] as const).map(([val, label]) => (
                            <button key={val} onClick={() => { setAiType(val); setAiResult(''); }} style={{
                                flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                                background: aiType === val ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-card)',
                                color: aiType === val ? 'white' : 'var(--text-muted)',
                                border: aiType === val ? 'none' : '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                            }}>{label}</button>
                        ))}
                    </div>

                    {/* Tone selector */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {([['friendly', '😊 Thân thiện'], ['casual', '👋 Thoải mái'], ['formal', '🤝 Trang trọng']] as const).map(([val, label]) => (
                            <button key={val} onClick={() => setAiTone(val)} style={{
                                flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                                background: aiTone === val ? `rgba(139,92,246,0.1)` : 'transparent',
                                color: aiTone === val ? '#8b5cf6' : 'var(--text-muted)',
                                border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                            }}>{label}</button>
                        ))}
                    </div>

                    {/* Custom prompt */}
                    <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Yêu cầu thêm (tuỳ chọn): VD: nhấn mạnh ưu đãi 30%..."
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '13px', fontFamily: 'inherit', color: 'var(--text-primary)' }}
                    />

                    {/* Generate button */}
                    <button onClick={generateContent} disabled={aiGenerating || !selectedLead} style={{
                        padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                        background: !selectedLead ? 'var(--bg-input)' : aiGenerating ? 'var(--bg-input)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        color: !selectedLead || aiGenerating ? 'var(--text-muted)' : 'white', border: 'none',
                        cursor: !selectedLead || aiGenerating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    }}>
                        {aiGenerating ? '⏳ Đang viết...' : '✨ Tạo nội dung'}
                    </button>

                    {/* Result */}
                    {aiResult && (
                        <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)' }}>✨ Kết quả</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => { navigator.clipboard.writeText(aiResult); setAiCopied(true); setTimeout(() => setAiCopied(false), 2000); }} style={{
                                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                        background: aiCopied ? '#22c55e' : 'rgba(99,102,241,0.1)', color: aiCopied ? 'white' : '#6366f1',
                                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                    }}>{aiCopied ? '✓ Đã copy' : '📋 Copy'}</button>
                                    <button onClick={generateContent} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>↻ Viết lại</button>
                                </div>
                            </div>
                            <div style={{ fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiResult}</div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════ TAB: Automation ══════════ */}
            {activeTab === 'automation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>⚡ Pipeline Automation</h2>
                        <button onClick={runAutoAll} disabled={autoRunning} style={{
                            padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                            background: autoRunning ? 'var(--bg-input)' : 'linear-gradient(135deg, #22c55e, #3b82f6)',
                            color: autoRunning ? 'var(--text-muted)' : 'white', border: 'none',
                            cursor: autoRunning ? 'wait' : 'pointer', fontFamily: 'inherit',
                        }}>{autoRunning ? '⏳ Đang chạy...' : '▶ Chạy tất cả'}</button>
                    </div>

                    {autoLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ Đang tải...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {autoRules.map(rule => (
                                <div key={rule.id} style={{
                                    padding: '14px', borderRadius: '12px',
                                    background: rule.enabled ? 'var(--bg-card)' : 'rgba(107,114,128,0.04)',
                                    border: `1px solid ${rule.enabled ? 'var(--border)' : 'rgba(107,114,128,0.1)'}`,
                                    opacity: rule.enabled ? 1 : 0.5, transition: 'all 200ms',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700 }}>{rule.name}</span>
                                        <button onClick={() => toggleAutoRule(rule.id)} disabled={autoToggling === rule.id} style={{
                                            width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                                            background: rule.enabled ? '#22c55e' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 200ms',
                                        }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: rule.enabled ? '23px' : '3px', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                        <span><b>Điều kiện:</b> {TRIGGER_VN[rule.trigger.type] || rule.trigger.type}{rule.trigger.status && <b>{rule.trigger.status}</b>}{rule.trigger.days && <b>{rule.trigger.days} ngày</b>}</span>
                                        <span><b>Hành động:</b> {ACTION_VN[rule.action.type] || rule.action.type}{rule.action.taskTitle && ` "${rule.action.taskTitle}"`}{rule.action.newStatus && ` → ${rule.action.newStatus}`}</span>
                                    </div>
                                    {rule.lastRun && <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>Chạy cuối: {new Date(rule.lastRun).toLocaleString('vi-VN')} · {rule.matchCount} khớp</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Run results */}
                    {autoResults && (
                        <div style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.15)' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px' }}>✅ Kết quả</h3>
                            {autoResults.length === 0 ? (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Không có rule nào kích hoạt.</p>
                            ) : autoResults.map(r => (
                                <div key={r.ruleId} style={{ padding: '6px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '12px', marginBottom: '4px' }}>
                                    <b>{r.ruleName}</b>: {r.matched} khớp, {r.actions.length} hành động
                                    {r.actions.map((a, i) => <div key={i} style={{ color: '#22c55e', marginTop: '2px' }}>✓ {a}</div>)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════ TAB: Revenue Forecast ══════════ */}
            {activeTab === 'forecast' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📈 Dự báo Doanh thu</h2>
                        <button onClick={loadForecast} disabled={forecastLoading} style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'none', cursor: forecastLoading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{forecastLoading ? '⏳' : '↻'} Làm mới</button>
                    </div>
                    {forecastLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ Đang phân tích pipeline...</div>
                    ) : forecastData ? (
                        <>
                            {/* Forecast cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(59,130,246,0.15)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Tổng Pipeline</div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>{(forecastData.totalPipeline / 1000000).toFixed(1)}M</div>
                                </div>
                                <div style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Dự báo (có trọng số)</div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#22c55e' }}>{(forecastData.weightedForecast / 1000000).toFixed(1)}M</div>
                                </div>
                            </div>
                            {/* Pipeline breakdown */}
                            {forecastData.byStatus && (
                                <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phân bổ theo gói</div>
                                    {Object.entries(forecastData.byStatus as Record<string, { count: number; value: number; weighted: number }>).map(([status, data]) => (
                                        <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                                            <span style={{ fontWeight: 600 }}>{STATUS_VN[status] || status} ({data.count})</span>
                                            <span style={{ color: '#22c55e', fontWeight: 700 }}>{(data.weighted / 1000000).toFixed(1)}M</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* AI narrative */}
                            {forecastData.aiNarrative && (
                                <div style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(139,92,246,0.06))', border: '1px solid rgba(168,85,247,0.15)', fontSize: '13px', lineHeight: 1.6 }}>
                                    🤖 {forecastData.aiNarrative}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {/* ══════════ TAB: Cohort Analysis ══════════ */}
            {activeTab === 'cohort' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>👥 Cohort Analysis</h2>
                    {cohortLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ Đang phân tích...</div>
                    ) : cohortData.length > 0 ? (
                        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-card)' }}>
                                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Tháng</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Total</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)', color: '#22c55e' }}>Converted</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)', color: '#ef4444' }}>Churned</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)', color: '#3b82f6' }}>Conv %</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)', color: '#f59e0b' }}>Retention %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cohortData.map((c: { month: string; total: number; converted: number; churned: number; conversionRate: number; retentionRate: number }) => (
                                        <tr key={c.month} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.month}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{c.total}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>{c.converted}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ef4444' }}>{c.churned}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: c.conversionRate > 30 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: c.conversionRate > 30 ? '#22c55e' : '#f59e0b' }}>{c.conversionRate}%</span>
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: c.retentionRate > 70 ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', color: c.retentionRate > 70 ? '#3b82f6' : '#ef4444' }}>{c.retentionRate}%</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có dữ liệu cohort</div>}
                </div>
            )}

            {/* ══════════ TAB: Channel ROI ══════════ */}
            {activeTab === 'roi' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>💰 Channel ROI Analysis</h2>
                    {roiLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ Đang phân tích...</div>
                    ) : roiData.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {roiData.map((ch: { source: string; total: number; converted: number; conversionRate: number; cpl: number; cpa: number; roi: number }) => (
                                <div key={ch.source} style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{ch.source}</span>
                                        <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, background: ch.roi >= 100 ? 'rgba(34,197,94,0.1)' : ch.roi > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: ch.roi >= 100 ? '#22c55e' : ch.roi > 0 ? '#f59e0b' : '#ef4444' }}>
                                            ROI: {ch.roi >= 9999 ? '∞' : `${ch.roi}%`}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px' }}>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Leads:</span> <b>{ch.total}</b></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Conv:</span> <b style={{ color: '#22c55e' }}>{ch.conversionRate}%</b></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>CPL:</span> <b>{ch.cpl > 0 ? `${(ch.cpl / 1000).toFixed(0)}K` : 'Free'}</b></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>CPA:</span> <b>{ch.cpa > 0 ? `${(ch.cpa / 1000).toFixed(0)}K` : '—'}</b></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có dữ liệu ROI</div>}
                </div>
            )}

            {/* ══════════ TAB: Drip Campaigns ══════════ */}
            {activeTab === 'drip' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📧 Email Drip Campaigns</h2>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setDripShowCreate(!dripShowCreate); setDripNewSteps([]); }} style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: dripShowCreate ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: dripShowCreate ? '#ef4444' : '#3b82f6', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{dripShowCreate ? '✕ Hủy' : '+ Tạo mới'}</button>
                            <button onClick={async () => {
                                setDripExecuting(true); setDripExecResults(null);
                                try {
                                    const r = await fetch('/api/emk-crm/drip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'execute' }) });
                                    const d = await r.json();
                                    setDripExecResults(d.results || []);
                                    loadDripCampaigns();
                                } catch { setDripExecResults([]); }
                                setDripExecuting(false);
                            }} disabled={dripExecuting} style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'none', cursor: dripExecuting ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{dripExecuting ? '⏳' : '▶'} Chạy tất cả</button>
                        </div>
                    </div>

                    {/* Create form */}
                    {dripShowCreate && (
                        <div style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.06))', border: '1px solid rgba(59,130,246,0.15)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>✨ Tạo Drip Campaign mới</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                <input value={dripNewName} onChange={e => setDripNewName(e.target.value)} placeholder="Tên campaign" style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg-card)' }} />
                                <select value={dripNewTrigger} onChange={e => setDripNewTrigger(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg-card)' }}>
                                    {Object.entries(STATUS_VN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                                <button onClick={async () => {
                                    setDripGenerating(true);
                                    try {
                                        const r = await fetch('/api/emk-crm/drip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ai-generate', triggerStatus: dripNewTrigger }) });
                                        const d = await r.json();
                                        setDripNewSteps(d.steps || []);
                                    } catch { /* ignore */ }
                                    setDripGenerating(false);
                                }} disabled={dripGenerating} style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: 'none', cursor: dripGenerating ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{dripGenerating ? '⏳ Đang tạo...' : '🤖 AI Tạo các bước'}</button>
                                {dripNewSteps.length > 0 && dripNewName && (
                                    <button onClick={async () => {
                                        setDripCreating(true);
                                        try {
                                            await fetch('/api/emk-crm/drip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: dripNewName, triggerStatus: dripNewTrigger, steps: dripNewSteps }) });
                                            setDripShowCreate(false); setDripNewName(''); setDripNewSteps([]);
                                            loadDripCampaigns();
                                        } catch { /* ignore */ }
                                        setDripCreating(false);
                                    }} disabled={dripCreating} style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'none', cursor: dripCreating ? 'wait' : 'pointer', fontFamily: 'inherit' }}>✔ Lưu campaign</button>
                                )}
                            </div>
                            {/* Preview steps */}
                            {dripNewSteps.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {dripNewSteps.map((s, i) => (
                                        <div key={i} style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <b>Bước {i + 1}: Ngày +{s.delay}</b>
                                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{s.channel}</span>
                                            </div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.subject}</div>
                                            <div style={{ color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{s.body}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Execution results */}
                    {dripExecResults && (
                        <div style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.15)' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px' }}>✅ Kết quả chạy</h3>
                            {dripExecResults.length === 0 ? (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Không có campaign nào kích hoạt.</p>
                            ) : dripExecResults.map((r: { campaignName: string; matched: number; sent: number; skipped: number }, i: number) => (
                                <div key={i} style={{ padding: '6px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '12px', marginBottom: '4px' }}>
                                    <b>{r.campaignName}</b>: {r.matched} leads, <span style={{ color: '#22c55e' }}>{r.sent} sent</span>, <span style={{ color: 'var(--text-muted)' }}>{r.skipped} skipped</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Campaign list */}
                    {dripLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ Đang tải...</div>
                    ) : dripCampaigns.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {dripCampaigns.map(c => (
                                <div key={c.id} style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: c.isActive ? 1 : 0.6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</span>
                                            <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>Trigger: {STATUS_VN[c.triggerStatus] || c.triggerStatus}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.totalSent} đã gửi</span>
                                            <button onClick={async () => {
                                                await fetch('/api/emk-crm/drip', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, isActive: !c.isActive }) });
                                                loadDripCampaigns();
                                            }} style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: c.isActive ? '#22c55e' : '#6b7280', position: 'relative', transition: 'background 0.2s' }}>
                                                <span style={{ position: 'absolute', top: '2px', left: c.isActive ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                                            </button>
                                            <button onClick={async () => {
                                                if (!confirm('Địa chắc muốn xóa campaign này?')) return;
                                                await fetch('/api/emk-crm/drip', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }) });
                                                loadDripCampaigns();
                                            }} style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
                                        </div>
                                    </div>
                                    {c.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>{c.description}</div>}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {c.steps.map((s, i) => (
                                            <div key={i} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)', color: '#6366f1' }}>
                                                📨 Ngày +{s.delay}: {s.subject}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có drip campaign nào. Bấm “+ Tạo mới” để bắt đầu!</div>}
                </div>
            )}

            {/* ══════════ TAB: Messaging ══════════ */}
            {activeTab === 'messaging' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📱 Gửi tin nhắn Zalo / SMS</h2>

                    {/* Send form */}
                    <div style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <select value={msgLeadId} onChange={e => { setMsgLeadId(e.target.value); setMsgSentResult(null); if (e.target.value) { fetch(`/api/emk-crm/messaging?leadId=${e.target.value}`).then(r => r.json()).then(d => setMsgHistory(d.history || [])); } }} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg-card)' }}>
                                <option value="">— Chọn lead —</option>
                                {msgLeadsList.map((l: { id: string; name: string; phone?: string }) => <option key={l.id} value={l.id}>{l.name} {l.phone ? `(${l.phone})` : ''}</option>)}
                            </select>
                            <select value={msgChannel} onChange={e => setMsgChannel(e.target.value as 'ZALO' | 'SMS' | 'EMAIL')} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg-card)' }}>
                                <option value="ZALO">🟢 Zalo</option>
                                <option value="SMS">📨 SMS</option>
                                <option value="EMAIL">📧 Email</option>
                            </select>
                        </div>
                        <textarea value={msgContent} onChange={e => setMsgContent(e.target.value)} placeholder="Nội dung tin nhắn..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg-card)', resize: 'vertical', boxSizing: 'border-box', marginBottom: '8px' }} />
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={async () => {
                                if (!msgLeadId || !msgContent) return;
                                setMsgSending(true); setMsgSentResult(null);
                                try {
                                    const r = await fetch('/api/emk-crm/messaging', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: msgLeadId, channel: msgChannel, content: msgContent }) });
                                    const d = await r.json();
                                    setMsgSentResult(d.error ? `❌ ${d.error}` : `✅ Đã gửi ${d.channel} cho ${d.recipient}`);
                                    setMsgContent('');
                                    // Refresh history
                                    const hr = await fetch(`/api/emk-crm/messaging?leadId=${msgLeadId}`);
                                    const hd = await hr.json();
                                    setMsgHistory(hd.history || []);
                                } catch { setMsgSentResult('❌ Lỗi gửi tin nhắn'); }
                                setMsgSending(false);
                            }} disabled={msgSending || !msgLeadId || !msgContent} style={{ padding: '6px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'none', cursor: msgSending ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{msgSending ? '⏳' : '✉️'} Gửi</button>
                            {msgSentResult && <span style={{ fontSize: '12px', fontWeight: 500 }}>{msgSentResult}</span>}
                        </div>
                    </div>

                    {/* Templates */}
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px' }}>📋 Mẫu tin nhắn ({msgTemplates.length})</h3>
                        {msgLoading ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>⏳</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
                                {msgTemplates.map(t => (
                                    <div key={t.id} onClick={() => setMsgContent(t.content)} style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <b>{t.name}</b>
                                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: t.channel === 'ZALO' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: t.channel === 'ZALO' ? '#22c55e' : '#3b82f6' }}>{t.channel}</span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>{t.content.slice(0, 80)}...</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* History */}
                    {msgLeadId && msgHistory.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px' }}>💬 Lịch sử ({msgHistory.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {msgHistory.map(h => (
                                    <div key={h.id} style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span style={{ fontWeight: 600 }}>{h.channel === 'ZALO' ? '🟢' : h.channel === 'SMS' ? '📨' : '📧'} {h.channel}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{new Date(h.sentAt).toLocaleString('vi')}</span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)' }}>{h.content.slice(0, 100)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes aiPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );
}
