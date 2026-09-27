# Pixel Morph Lab — Tutorial Series

A hands-on tutorial-series developer blog that ships an **embedded runnable demo** of pixel sorting, image morphing, and glitch art. The default canvas morphs `smile_01.png` into `smile_06.png` (both included), and any user can upload their own images to try the algorithm on real content.

> Branch **`pixel-morph-lab`** — a self-contained addition that does **not** touch `main` or any other existing branch. It adds a new project under `pixel-morph-lab/` and a standalone single-file replica at the repo root.

## Deliverables

| Path | What it is |
|------|------------|
| `pixel-morph-lab/` | Full Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui source tree |
| `pixel-morph-lab/standalone.html` | Self-contained single-file replica (231 KB) |
| `pixel-morph-lab-standalone.html` | Same standalone HTML at the repo root for easy discovery |
| `pixel-morph-lab/public/demo/smile_01.png` | Calm face — the default **source** image |
| `pixel-morph-lab/public/demo/smile_06.png` | Extreme grin — the default **target** image |
| `pixel-morph-lab/upload/` | Same two PNGs mirrored (matches the IM upload convention) |
| `pixel-morph-lab/worklog.md` | Build log with Task ID and stage summary |

## Features

### Core pixel transformation
- **Pixel Sort** — sort rows or columns by brightness / hue / saturation / R / G / B with a threshold band and an intensity lerp (multi-pass).
- **Morph** — linear or ease-in-out cross-dissolve between two same-sized RGBA buffers.
- **Glitch** — mulberry32-seeded block-shift glitch with configurable block count and amount.
- **Pipeline** — compose sort → morph → glitch in one render path.
- **Custom upload** — drag in your own PNG/JPG for both source and target; target auto-resized to match source.
- **PNG export** — one-click download of the rendered canvas at full (up to 400 px) resolution.

### Tutorial-series developer blog
- **Hero section** — featured series banner + "new chapters this week" callouts.
- **Series Library** — grid of 4 series cards with completion percentage.
- **Series Page** — chapter list + an interactive node-graph prerequisite map (hover to highlight edges).
- **Chapter pages** — prose serif body, embedded runnable code playground, and per-chapter comments.
- **Sticky TOC** — highlights the active heading as you scroll, with `IntersectionObserver`.
- **Progress checklist** — auto-marks chapters complete once you scroll past 80% of them, with a gold-tick + confetti + soft chime celebration.
- **Diff widget** — animates from before-code to after-code with LCS-based diff highlighting.
- **Code playground** — textarea + Run button, sandboxed via `new Function(...)` with intercepted `console.log`.
- **Per-chapter comments** — like buttons + nested replies, session-only.
- **Light / dim mode** — toggle from the header; persists in `localStorage`.

## Tech stack
- Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS 4 · shadcn/ui (New York)
- Newsreader (prose serif) · JetBrains Mono (code) · Geist (UI sans)
- next-themes for light/dark
- Canvas 2D `getImageData` / `putImageData` for per-pixel work
- IntersectionObserver for scroll-driven UI

## Running the Next.js app
```bash
cd pixel-morph-lab
bun install
bun run dev        # serves on http://localhost:3000
bun run lint       # 0 errors, 0 warnings
```

## Running the standalone single-file HTML
Just open `pixel-morph-lab-standalone.html` (or `pixel-morph-lab/standalone.html`) in any modern browser. No build step, no server, no network requests — both smile images are inlined as base64 data URLs.

## License
MIT.
