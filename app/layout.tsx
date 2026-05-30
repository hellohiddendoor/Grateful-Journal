import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grateful Journal",
  description: "A family gratitude journaling app",
  // No manifest/icons here — handled manually below to avoid duplicate tags
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Grateful",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#C8A96E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA manifest — static file in public/, always returns 200 */}
        <link rel="manifest" href="/manifest.json" />

        {/* Android Chrome PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#C8A96E" />

        {/* iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Grateful" />
        <link rel="apple-touch-icon" href="/icon.svg" />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
