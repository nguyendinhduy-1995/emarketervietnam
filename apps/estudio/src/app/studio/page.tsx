'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Loader2, Copy, Check } from 'lucide-react';

const CATEGORIES = [
    'Mẹo Vặt Cuộc Sống', 'Mẹo Nấu Ăn', 'Thủ Công & DIY',
    'Mẹo Học Tập', 'Mẹo Dọn Dẹp', 'Công Nghệ',
];
const TONES = ['Năng động', 'Hài hước', 'Kịch tính', 'Điềm tĩnh', 'Sáng tạo'];
const ART_STYLES = [
    { id: 'pixar', label: '3D Pixar', prompt: '3D Pixar style, cute characters, vibrant colors' },
    { id: 'anime', label: 'Anime', prompt: 'Anime style, detailed, colorful, expressive' },
    { id: 'realistic', label: 'Thực tế', prompt: 'Photorealistic, cinematic lighting, 4K' },
    { id: 'watercolor', label: 'Màu nước', prompt: 'Watercolor painting, soft edges, dreamy' },
];

interface Scene {
    scene_title: string;
    dialogue: string;
    visual_prompt: string;
    emotion: string;
    camera_angle: string;
    duration: string;
}
interface Script {
    title: string;
    character_info?: { name: string; description: string };
    scenes: Scene[];
}

export default function StudioPage() {
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [object, setObject] = useState('');
    const [tip, setTip] = useState('');
    const [mood, setMood] = useState(TONES[0]);
    const [artStyle, setArtStyle] = useState(ART_STYLES[0].id);
    const [language, setLanguage] = useState('Tiếng Việt');
    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState<Script | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!object || !tip) { setError('Vui lòng nhập đồ vật và mẹo vặt'); return; }
        setLoading(true);
        setError('');
        setScript(null);

        const artPrompt = ART_STYLES.find(s => s.id === artStyle)?.prompt || ART_STYLES[0].prompt;
        const prompt = `Viết kịch bản video ngắn (TikTok/Shorts) nhân hóa đồ vật:
- Chủ đề: ${category}
- Đồ vật nhân hóa: ${object}
- Mẹo/Nội dung: ${tip}
- Tone giọng: ${mood}
- Ngôn ngữ: ${language}
- Art style: ${artPrompt}

Trả về JSON:
{
  "title": "Tiêu đề video hấp dẫn",
  "character_info": { "name": "Tên nhân vật", "description": "Mô tả ngoại hình tiếng Anh" },
  "scenes": [
    {
      "scene_title": "Tên cảnh",
      "camera_angle": "Góc máy",
      "visual_prompt": "English visual prompt, ${artPrompt}, 9:16, 4k",
      "dialogue": "Lời thoại (${language})",
      "emotion": "Cảm xúc",
      "duration": "3-5s"
    }
  ]
}
Tạo 4-6 cảnh hài hước, engaging. Visual prompt bằng tiếng Anh.`;

        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, json: true }),
            });
            const data = await res.json();
            if (data.error) { setError(data.error); return; }
            setScript(data.result as Script);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    const copyScript = () => {
        if (!script) return;
        navigator.clipboard.writeText(JSON.stringify(script, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <Link href="/" className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        🎬 Studio
                    </h1>
                    <p className="text-xs text-gray-500">Viết kịch bản video AI — nhân hóa đồ vật</p>
                </div>
            </div>

            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Chủ đề</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Tone giọng</label>
                    <select value={mood} onChange={e => setMood(e.target.value)}
                        className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Đồ vật nhân hóa *</label>
                    <input type="text" value={object} onChange={e => setObject(e.target.value)}
                        placeholder="VD: Một quả chanh tươi"
                        className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Mẹo / Nội dung *</label>
                    <input type="text" value={tip} onChange={e => setTip(e.target.value)}
                        placeholder="VD: Cách vắt chanh được nhiều nước nhất"
                        className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Art Style</label>
                    <select value={artStyle} onChange={e => setArtStyle(e.target.value)}
                        className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        {ART_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Ngôn ngữ</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)}
                        className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option>Tiếng Việt</option>
                        <option>English</option>
                    </select>
                </div>
            </div>

            {/* Generate Button */}
            <button onClick={handleGenerate} disabled={loading}
                className="w-full p-4 rounded-xl font-bold text-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang viết kịch bản...</> : <><Sparkles className="w-5 h-5" /> Viết kịch bản AI</>}
            </button>

            {/* Error */}
            {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Result */}
            {script && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">{script.title}</h2>
                        <button onClick={copyScript}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors">
                            {copied ? <><Check className="w-4 h-4 text-green-400" /> Đã copy</> : <><Copy className="w-4 h-4" /> Copy JSON</>}
                        </button>
                    </div>

                    {script.character_info && (
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                            <p className="text-sm font-semibold text-indigo-300">🎭 {script.character_info.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{script.character_info.description}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {script.scenes?.map((scene, i) => (
                            <div key={i} className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-indigo-300">Cảnh {i + 1}: {scene.scene_title}</span>
                                    <span className="text-xs text-gray-500">{scene.duration} • {scene.camera_angle}</span>
                                </div>
                                {scene.dialogue && (
                                    <p className="text-sm mb-2">💬 {scene.dialogue}</p>
                                )}
                                <p className="text-xs text-gray-500">🎨 {scene.visual_prompt}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{scene.emotion}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
