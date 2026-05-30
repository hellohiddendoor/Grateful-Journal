import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grateful Journal",
  description: "A family gratitude journaling app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Grateful",
  },
  formatDetection: { telephone: false },
  icons: {
    // Browser tab favicon — served as PNG by app/icon.tsx
    icon: [{ url: "/icon", sizes: "512x512", type: "image/png" }],
    // iOS home screen — served as PNG by app/apple-icon.tsx
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    // SVG fallback for browsers that support it
    other: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
  },
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
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Android Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#C8A96E" />

        {/* iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Grateful" />
        <link rel="apple-touch-icon" href="/apple-icon" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/icon" sizes="512x512" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
