import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "奶蛙桌宠 · Web 版",
  description: "来自 43aquaris/naiwa 的奶蛙桌宠 Web 独立版：四形态帧动画 + 点击微笑 + 连点大笑 + 拖拽甩飞物理 + 手机体感",
};

/* 移动端适配：禁缩放 + viewport-fit=cover（iPhone 安全区） */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f5e9c8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
