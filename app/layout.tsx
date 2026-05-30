import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grateful Journal",
  description: "A family gratitude journaling app",
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
        {/* PWA manifest — static PNG files, always return 200 */}
        <link rel="manifest" href="/manifest.json" />

        {/* Android Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#C8A96E" />

        {/* iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Grateful" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
