'use client';

import Link from 'next/link';
import { useEntitlement, IfFeature } from '@/components/FeatureGate';
import { Sparkles, Video, Shirt, Youtube, Zap, Image, FileText } from 'lucide-react';

const TOOLS = [
  { key: 'ESTUDIO_CORE', icon: Sparkles, label: 'Studio', desc: 'Viết kịch bản AI cho TikTok / Shorts', href: '/studio', color: 'from-indigo-500 to-purple-600', always: true },
  { key: 'ESTUDIO_YOUTUBE', icon: Youtube, label: 'YouTube', desc: 'Viết script YouTube Creator', href: '/youtube', color: 'from-red-500 to-rose-600' },
  { key: 'ESTUDIO_FASHION', icon: Shirt, label: 'Fashion AI', desc: 'Thiết kế thời trang bằng AI', href: '/fashion', color: 'from-pink-500 to-fuchsia-600' },
  { key: 'ESTUDIO_IMAGE_GEN', icon: Image, label: 'Image Gen', desc: 'Tạo ảnh AI với Gemini Imagen', href: '/image-gen', color: 'from-amber-500 to-orange-600' },
  { key: 'ESTUDIO_VIDEO_GEN', icon: Video, label: 'Video AI', desc: 'Tạo video bằng Veo AI', href: '/video-gen', color: 'from-emerald-500 to-teal-600' },
  { key: 'ESTUDIO_BATCH', icon: Zap, label: 'Batch Mode', desc: 'Tạo kịch bản hàng loạt', href: '/batch', color: 'from-cyan-500 to-blue-600' },
  { key: 'ESTUDIO_EXPORT', icon: FileText, label: 'Export', desc: 'Xuất Excel / JSON', href: '/export', color: 'from-gray-500 to-slate-600' },
];

export default function HomePage() {
  const { hasFeature, suspended, loading, planKey } = useEntitlement();
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.emarketervietnam.vn';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎬</div>
          <p className="text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              eStudio
            </h1>
            <p className="text-gray-400 text-sm mt-1">AI Content Studio • Powered by eMarketer Hub</p>
          </div>
          <div className="flex items-center gap-3">
            {planKey && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {planKey}
              </span>
            )}
            <a
              href={`${hubUrl}/hub/marketplace`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
            >
              🛒 Marketplace
            </a>
          </div>
        </div>

        {suspended && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-semibold mb-6">
            ⚠️ Tài khoản đã bị tạm ngưng. Vui lòng liên hệ hỗ trợ hoặc gia hạn subscription.
          </div>
        )}
      </header>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const enabled = tool.always || hasFeature(tool.key);
          const locked = !enabled;

          return (
            <div key={tool.key} className="relative group">
              {locked ? (
                <div className="block p-6 rounded-2xl border border-gray-800 bg-gray-900/50 opacity-60 cursor-not-allowed">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 opacity-50`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-400 mb-1">{tool.label}</h3>
                  <p className="text-xs text-gray-500">{tool.desc}</p>
                  <div className="absolute top-3 right-3 text-xl">🔒</div>
                </div>
              ) : (
                <Link
                  href={tool.href}
                  className="block p-6 rounded-2xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800/70 hover:border-gray-700 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/5"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{tool.label}</h3>
                  <p className="text-xs text-gray-400">{tool.desc}</p>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Preview */}
      <IfFeature feature="ESTUDIO_CORE">
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Kịch bản', value: '—', icon: '📝' },
            { label: 'Ảnh AI', value: '—', icon: '🎨' },
            { label: 'Video', value: '—', icon: '🎬' },
            { label: 'Thời trang', value: '—', icon: '👗' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </IfFeature>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-gray-600">
        <p>eStudio v1.0 • Powered by <a href={hubUrl} className="text-indigo-400 hover:underline">eMarketer Hub</a></p>
      </footer>
    </div>
  );
}
