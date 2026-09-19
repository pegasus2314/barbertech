// BarberTech — desarrollado por Albert Silvestre
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { siteUrl } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "BarberTech",
    template: "%s | BarberTech",
  },
  description: "Gestión y reservas en línea para barberías modernas.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "BarberTech",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "BarberTech",
    description: "Gestión y reservas en línea para barberías modernas.",
    siteName: "BarberTech",
  },
  twitter: {
    card: "summary_large_image",
    title: "BarberTech",
    description: "Gestión y reservas en línea para barberías modernas.",
  },
};

export const viewport = {
  themeColor: "#171717",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* Privacy-friendly page-view analytics: no cookies, no personal data. */}
        <Analytics />
      </body>
    </html>
  );
}
