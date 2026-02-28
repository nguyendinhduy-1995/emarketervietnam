import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { EntitlementProvider } from "@/components/FeatureGate";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "eStudio — AI Content Studio",
  description: "Tạo kịch bản video, ảnh, thời trang bằng AI. Powered by eMarketer Hub.",
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <body className={`${geist.className} antialiased bg-gray-950 text-white min-h-screen`}>
        <EntitlementProvider>
          {children}
        </EntitlementProvider>
      </body>
    </html>
  );
}
