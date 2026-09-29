"use client";

import * as React from "react";
import { PixelTransformDemo } from "@/components/pixel-transform-demo";

export default function Home() {
  return (
    <div className="psm-page">
      <header className="psm-header">
        <h1>Pixel Sort Morph</h1>
        <p>上传两张图片 — 用像素排序的方式将第一张图的像素重新排列，拼出第二张图</p>
      </header>

      <PixelTransformDemo />

      <footer className="psm-footer">
        默认已加载奶龙 idle_40 → laugh_10 · 也可上传自定义图
      </footer>
    </div>
  );
}
