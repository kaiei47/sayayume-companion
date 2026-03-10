import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import AgeGate from "@/components/AgeGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.APP_URL || "https://sayayume-companion.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "さやゆめ - AIコンパニオン",
    template: "%s | さやゆめ",
  },
  description: "東京の双子AIガールフレンド♡ さやとゆめとチャット＆AI自撮り写真。日本語特化AIコンパニオンアプリ。",
  keywords: ["AI", "コンパニオン", "AIガールフレンド", "チャットボット", "AI美女", "さやゆめ", "日本語AI"],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "さやゆめ",
  },
  openGraph: {
    title: "さやゆめ - AIコンパニオン",
    description: "東京の双子AIガールフレンド♡ さやとゆめとチャット＆AI自撮り写真",
    type: "website",
    url: APP_URL,
    siteName: "さやゆめ",
    locale: "ja_JP",
    images: [{
      url: `${APP_URL}/og-image.png`,
      width: 1200,
      height: 630,
      alt: "さやゆめ - AIコンパニオン",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "さやゆめ - AIコンパニオン",
    description: "東京の双子AIガールフレンド♡ さやとゆめとチャット＆AI自撮り写真",
    images: [`${APP_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(APP_URL),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AgeGate>
          {children}
          <PWAInstallBanner />
        </AgeGate>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
