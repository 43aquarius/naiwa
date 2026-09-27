import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "奶蛙桌宠 · Web 版",
  description: "来自 43aquaris/naiwa 的奶蛙桌宠 Web 独立版：四形态帧动画 + 点击微笑 + 连点大笑 + 拖拽甩飞物理",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
