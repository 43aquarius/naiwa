"use client";

import * as React from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

interface SeriesCard {
  id: string;
  title: string;
  description: string;
  chapters: number;
  completed: number;
  tags: string[];
  cover: { bg: string; fg: string; label: string };
}

const SERIES: SeriesCard[] = [
  {
    id: "essentials",
    title: "Pixel Morph Essentials",
    description:
      "From loading an image onto a canvas to composing sort + morph + glitch. Default demo: smile_01 → smile_06.",
    chapters: 6,
    completed: 4,
    tags: ["fundamentals", "canvas", "image-processing"],
    cover: { bg: "linear-gradient(135deg, #d97757, #f59e0b)", fg: "#fff", label: "01" },
  },
  {
    id: "glitch-art",
    title: "Advanced Glitch Art",
    description:
      "Datamoshing, block-shift glitches, RGB channel splits, and how to make pixel noise feel intentional.",
    chapters: 8,
    completed: 2,
    tags: ["advanced", "glitch", "aesthetic"],
    cover: { bg: "linear-gradient(135deg, #6366f1, #8b5cf6)", fg: "#fff", label: "02" },
  },
  {
    id: "color-theory",
    title: "Color Theory for Coders",
    description:
      "RGB vs HSL vs OKLCH, why sorting by hue feels different than sorting by brightness, and how to design palettes.",
    chapters: 5,
    completed: 0,
    tags: ["color", "theory", "design"],
    cover: { bg: "linear-gradient(135deg, #22c55e, #16a34a)", fg: "#fff", label: "03" },
  },
  {
    id: "performance",
    title: "Perf for Per-pixel Loops",
    description:
      "Web workers, OffscreenCanvas, typed arrays, and the cold hard truth about O(n log n) sorts on a 4096×4096 PNG.",
    chapters: 4,
    completed: 0,
    tags: ["performance", "web-workers", "canvas"],
    cover: { bg: "linear-gradient(135deg, #0ea5e9, #0284c7)", fg: "#fff", label: "04" },
  },
];

export function SeriesLibrary() {
  return (
    <section id="series-library" className="py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
              Series Library
            </h2>
            <p className="text-[var(--pml-prose-muted)] text-sm mt-1">
              Multi-part tutorial series. Progress is auto-saved as you scroll.
            </p>
          </div>
          <a
            href="#series-detail"
            className="text-sm text-[var(--pml-accent)] hover:underline hidden md:inline-flex items-center gap-1"
          >
            View all chapters <ArrowRight className="h-3 w-3" />
          </a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERIES.map((s) => {
            const pct = Math.round((s.completed / s.chapters) * 100);
            const isDone = s.completed === s.chapters;
            return (
              <a
                key={s.id}
                href="#series-detail"
                className="pml-card p-0 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 group"
              >
                <div
                  className="h-32 flex items-center justify-center text-3xl font-serif font-bold relative"
                  style={{ background: s.cover.bg, color: s.cover.fg }}
                >
                  <span className="opacity-70">{s.cover.label}</span>
                  <div className="absolute top-2 right-2">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <Circle className="h-4 w-4 text-white/70" />
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-lg font-semibold leading-tight group-hover:text-[var(--pml-accent)]">
                    {s.title}
                  </h3>
                  <p className="text-xs text-[var(--pml-prose-muted)] mt-1.5 leading-relaxed line-clamp-3">
                    {s.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                        style={{
                          background: "var(--pml-muted)",
                          color: "var(--pml-prose-muted)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[var(--pml-prose-muted)] font-mono">
                        {s.completed}/{s.chapters} chapters
                      </span>
                      <span className="text-[var(--pml-accent)] font-mono">
                        {pct}%
                      </span>
                    </div>
                    <div
                      className="h-1 rounded-full overflow-hidden"
                      style={{ background: "var(--pml-muted)" }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, var(--pml-accent), #fbbf24)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
