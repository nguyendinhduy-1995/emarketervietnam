import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import PwaRegistry from "@/components/PwaRegistry";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import QuickSearch from "@/components/QuickSearch";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "eMarketer Hub – Nền tảng CRM thông minh",
  description:
    "Tạo hệ thống CRM của riêng bạn trong 30 giây. Quản lý khách hàng, lịch hẹn, doanh thu và đội ngũ – tất cả trên một nền tảng duy nhất.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "eMarketer Hub",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Ensures native app-like feel
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PwaRegistry />
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <KeyboardShortcuts />
              <QuickSearch />
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
