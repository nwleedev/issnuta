import { ThemeProvider } from "@/entries/providers/ThemeProvider";
import { Toaster } from "@/entries/ui/Toaster";
import { AppProviders } from "./providers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Issnuta — Offline Translator",
    template: "%s · Issnuta",
  },
  description: "Mobile-first offline translator PWA (KO↔EN, KO↔JA)",
  manifest: "/manifest.webmanifest",
  themeColor: "#22d3ee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="system"
            enableSystem
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}
