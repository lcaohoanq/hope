import type { Metadata } from "next";
import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hope",
  description: "A personal workout consistency tracker for Hope.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
