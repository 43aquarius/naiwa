import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "像素排序变换 · Pixel Sort Morph",
  description:
    "上传两张图片 — 用像素排序的方式将第一张图的像素重新排列，拼出第二张图。默认加载奶龙 idle_40 → laugh_10。",
  keywords: [
    "像素排序",
    "pixel sort",
    "image morph",
    "奶龙",
    "canvas",
    "Next.js",
  ],
  authors: [{ name: "Pixel Sort Morph" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  openGraph: {
    title: "像素排序变换 · Pixel Sort Morph",
    description: "上传两张图片，用像素排序的方式把第一张图的像素重新排列拼出第二张图。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${jetbrains.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
