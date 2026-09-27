"use client";

import * as React from "react";
import { PixelTransformDemo } from "@/components/pixel-transform-demo";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header
        className="border-b"
        style={{
          borderColor: "var(--pml-border)",
          background: "var(--pml-card)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white text-xs font-bold"
            style={{
              background:
                "linear-gradient(135deg, var(--pml-accent), #6366f1)",
            }}
          >
            PM
          </span>
          <span className="font-serif text-base font-semibold tracking-tight">
            像素变换实验室
          </span>
          <span
            className="text-xs text-[var(--pml-prose-muted)] font-mono ml-1"
          >
            Pixel Morph Lab
          </span>
          <span className="ml-auto text-xs text-[var(--pml-prose-muted)]">
            默认示例：smile_01 → smile_06
          </span>
        </div>
      </header>

      <main className="flex-1 py-6 md:py-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <PixelTransformDemo />
        </div>
      </main>

      <footer
        className="mt-auto border-t py-3 text-center text-xs text-[var(--pml-prose-muted)]"
        style={{
          borderColor: "var(--pml-border)",
          background: "var(--pml-muted)",
        }}
      >
        © {new Date().getFullYear()} 像素变换实验室 · 基于 Next.js + Canvas API 构建
      </footer>
    </div>
  );
}
