# 像素排序变换 · Pixel Sort Morph

仿照 https://pixel-sort-morph.netlify.app 的功能，做一个图片像素变换网站。默认加载奶龙 `idle_40.png` → `laugh_10.png`，也可上传自定义图。

> 分支 **`pixel-morph-lab`** —— 独立新增项目，不修改 main 或其他已有分支。

## 算法说明（这才是真正的"像素排序变换"）

> 与"按行排序像素"不同，本网站实现的是参考站的原版算法：

1. 把 A、B 两张图都按某个指标（明度 / 饱和度 / 色相 / R / G / B）排序
2. **A 中第 i 个像素（按指标排名）→ 移动到 B 中第 i 个像素的位置**
3. 用 `easeInOutCubic` 在指定时长（1.5 / 2.5 / 4 / 6 秒）内逐帧插值绘制
4. 可选拖尾效果（每帧 decay=0.98 衰减到背景）+ 图 A 作背景

视觉效果：A 的像素"重新排列"，最终拼出 B 的结构（颜色仍是 A 的颜色，但位置是 B 的）。

## 交付物

| 路径 | 说明 |
|------|------|
| `pixel-morph-lab/` | Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui 完整源码 |
| `pixel-morph-lab/standalone.html` | 单文件 HTML 复刻版（约 482 KB，自包含） |
| `pixel-morph-lab-standalone.html` | 仓库根目录的同款单文件 HTML，方便直接打开 |
| `pixel-morph-lab/public/demo/idle_40.png` | 默认源图（奶龙静止状态，取自 main 仓库 assets/idle/idle_40.png） |
| `pixel-morph-lab/public/demo/laugh_10.png` | 默认目标图（奶龙大笑状态，取自 main 仓库 assets/laugh/laugh_10.png） |

## 功能

- **进入页面即自动加载默认奶龙图**（idle_40 → laugh_10），可直接点击"开始变换"
- **上传 / 拖拽自定义图**：A 和 B 都可换，自动居中裁剪为正方形并缩放到当前分辨率
- **分辨率滑块**：50–250，默认 120，松手时重处理两张图
- **排序依据**：明度 / 饱和度 / 色相 / 红色 / 绿色 / 蓝色通道
- **动画时长**：1.5 / 2.5 / 4 / 6 秒
- **拖尾效果**：toggle，decay=0.98，像素移动会留下渐隐拖尾
- **背景图A**：toggle，把图 A 作为动画背景（而非暗色）
- **重置**：回到图 A 初始状态
- **响应式**：移动端布局自动切换为竖排
- **暗色主题**：#0d0d1a 背景、紫蓝渐变（#6c63ff → #00d2a0）、像素化渲染（`image-rendering: pixelated`）

## 运行

### Next.js 版本
```bash
cd pixel-morph-lab
bun install
bun run dev     # http://localhost:3000
```

### 单文件 HTML 版本
直接双击 `pixel-morph-lab-standalone.html` 或 `pixel-morph-lab/standalone.html` 用任意现代浏览器打开，无构建、无服务器、无网络请求（两张默认图已 base64 内联）。

## 浏览器验证（agent-browser）

- 主页返回 200，canvas 渲染 120×120，状态文本"准备就绪 — 点击"开始变换"查看动画"
- 点击"开始变换" → 状态变为"变换中..."（紫色） → 2.5 秒后变为"变换完成！用图片 A 的像素拼出了图片 B 的结构"（绿色）
- 拖尾效果 toggle + 变换：动画正常运行
- 单文件 HTML 同步验证通过

## 许可证
MIT
