'use client';

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <div className="w-24 h-24 mb-6 text-slate-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 18h.01M11 14h2M12 6a4 4 0 00-4 4h8a4 4 0 00-4-4z" />
                    <line x1="3" y1="3" x2="21" y2="21" />
                </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-slate-800 dark:text-slate-100">Không có kết nối mạng</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md text-lg">
                Thiết bị hiện đang ngoại tuyến. Vui lòng kiểm tra lại kết nối Wi-Fi hoặc 4G của bạn để tải dữ liệu eMarketer Hub.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white rounded-xl font-medium shadow-sm"
            >
                Thử lại ngay
            </button>
        </div>
    );
}
