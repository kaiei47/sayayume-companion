import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PWAInstallBanner from "@/components/PWAInstallBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.APP_URL || "https://www.sayayume.com";

export const metadata: Metadata = {
  title: {
    default: "さやゆめ - AI彼女",
    template: "%s | さやゆめ",
  },
  description: "東京の双子AIガールフレンド♡ さやとゆめとチャット＆AI自撮り写真。日本語AI彼女アプリ。",
  keywords: ["AI", "コンパニオン", "AIガールフレンド", "チャットボット", "AI美女", "さやゆめ", "日本語AI"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "さやゆめ",
  },
  openGraph: {
    title: "さやゆめ - AI彼女",
    description: "東京の双子AIガールフレンド♡ さやとゆめとチャット＆AI自撮り写真",
    type: "website",
    url: APP_URL,
    siteName: "さやゆめ",
    locale: "ja_JP",
    images: [{
      url: `${APP_URL}/og-image.png`,
      width: 1200,
      height: 630,
      alt: "さやゆめ - AI彼女",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "さやゆめ - AI彼女",
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
        {children}
        <PWAInstallBanner />
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-N5R8J7LXP0"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-N5R8J7LXP0');
          `}
        </Script>
      </body>
    </html>
  );
}
