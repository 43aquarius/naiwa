# 奶龙像素变换 · Nailong Pixel Morph

一个简单的图片像素变换工具，默认演示奶龙 `idle_40.png` → `laugh_10.png` 的转换，也支持自定义图片上传。

> 分支 **`pixel-morph-lab`** —— 独立新增项目，不修改 main 或其他已有分支。

## 交付物

| 路径 | 说明 |
|------|------|
| `pixel-morph-lab/` | Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui 完整源码 |
| `pixel-morph-lab/standalone.html` | 单文件 HTML 复刻版（约 487 KB，自包含） |
| `pixel-morph-lab-standalone.html` | 仓库根目录的同款单文件 HTML，方便直接打开 |
| `pixel-morph-lab/public/demo/idle_40.png` | 默认源图（奶龙静止状态，取自 main 仓库 assets/idle/idle_40.png） |
| `pixel-morph-lab/public/demo/laugh_10.png` | 默认目标图（奶龙大笑状态，取自 main 仓库 assets/laugh/laugh_10.png） |

## 功能

进入页面后立即就是默认的转换示例：奶龙 idle_40 → laugh_10，形变 50%，缓入缓出。
可切换四种模式：

- **像素排序** — 按行/列排序像素（亮度 / 色相 / 饱和度 / RGB），带阈值带与多趟强度 lerp
- **形变** — 两张图交叉溶解，线性或缓入缓出
- **故障** — 种子化的块位移故障效果
- **流水线** — 排序 → 形变 → 故障 串行执行

其他能力：
- 源图 / 目标图均可上传自定义 PNG / JPG（目标图自动按源图尺寸缩放）
- 一键导出当前画布为 PNG
- 亮 / 暗模式切换（localStorage 记忆）
- 自动运行开关（参数变化即时刷新）

## 主题色

整套配色基于奶龙形象：暖黄主色（#e9a813 亮色 / #f5c518 暗色）、奶白背景（#fefaf0）、奶白卡片（#fffdf5）。

## 运行

### Next.js 版本
```bash
cd pixel-morph-lab
bun install
bun run dev     # http://localhost:3000
```

### 单文件 HTML 版本
直接双击 `pixel-morph-lab-standalone.html` 或 `pixel-morph-lab/standalone.html` 用任意现代浏览器打开，无构建、无服务器、无网络请求（两张默认图已 base64 内联）。

## 许可证
MIT
