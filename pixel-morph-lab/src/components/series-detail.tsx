"use client";

import * as React from "react";
import { PrereqGraph } from "./prereq-graph";
import { CheckCircle2, Circle, Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChapterMeta {
  id: string;
  num: number;
  title: string;
  summary: string;
  duration: string;
  status: "completed" | "available" | "locked";
  tags: string[];
}

const CHAPTERS: ChapterMeta[] = [
  {
    id: "ch-intro",
    num: 1,
    title: "Why pixel morph matters",
    summary:
      "A short history of pixel sorting, glitch art and the smile_01 → smile_06 morph. Why image transforms make great tutorial material.",
    duration: "8 min",
    status: "completed",
    tags: ["intro"],
  },
  {
    id: "ch-canvas",
    num: 2,
    title: "The Canvas 2D API",
    summary:
      "Drawing an image to a canvas, reading pixels back with getImageData, and writing them with putImageData. Cross-origin caveats.",
    duration: "12 min",
    status: "completed",
    tags: ["canvas", "fundamentals"],
  },
  {
    id: "ch-pixelbuf",
    num: 3,
    title: "Pixel buffers & typed arrays",
    summary:
      "How RGBA bytes are laid out in a Uint8ClampedArray. Why clamped arrays matter for blending operations.",
    duration: "14 min",
    status: "completed",
    tags: ["memory", "fundamentals"],
  },
  {
    id: "ch-sort",
    num: 4,
    title: "Pixel sorting by brightness",
    summary:
      "The classic algorithm: walk rows, sort each line by a metric. Threshold bands to sort only some pixels.",
    duration: "18 min",
    status: "available",
    tags: ["hands-on", "sort"],
  },
  {
    id: "ch-morph",
    num: 5,
    title: "Cross-dissolve morphing",
    summary:
      "Linear and eased interpolation between two same-sized buffers. Our default: smile_01 → smile_06 at 50%.",
    duration: "15 min",
    status: "available",
    tags: ["hands-on", "morph"],
  },
  {
    id: "ch-demo",
    num: 6,
    title: "Live demo: full pipeline",
    summary:
      "Compose sort + morph + glitch in a single render path. Try the demo, upload your own images, export the result.",
    duration: "20 min",
    status: "available",
    tags: ["live-demo", "advanced"],
  },
];

export function SeriesDetail() {
  return (
    <section id="series-detail" className="py-12 bg-[var(--pml-muted)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-8">
          <Badge
            className="text-[10px] mb-2"
            style={{
              background: "var(--pml-accent)",
              color: "var(--pml-accent-fg)",
            }}
          >
            SERIES
          </Badge>
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            Pixel Morph Essentials — Chapter Map
          </h2>
          <p className="text-[var(--pml-prose-muted)] text-sm mt-1.5 max-w-2xl leading-relaxed">
            Six chapters take you from blank canvas to a fully composable
            pixel-transform pipeline. The interactive map below shows
            prerequisites — hover any node to highlight its edges.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Chapter list */}
          <div className="lg:col-span-7">
            <div className="pml-card p-4">
              <h3 className="text-sm font-semibold mb-3 text-[var(--pml-prose-muted)] uppercase tracking-wider">
                Chapter list
              </h3>
              <ol className="space-y-2">
                {CHAPTERS.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--pml-muted)] transition-colors group"
                    >
                      <div
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-bold"
                        style={{
                          background:
                            c.status === "completed"
                              ? "color-mix(in srgb, #22c55e 18%, transparent)"
                              : "var(--pml-muted)",
                          color:
                            c.status === "completed"
                              ? "#16a34a"
                              : "var(--pml-prose-muted)",
                        }}
                      >
                        {c.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : c.status === "locked" ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          c.num
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-serif text-base font-semibold group-hover:text-[var(--pml-accent)]">
                            <span className="font-mono text-xs text-[var(--pml-prose-muted)] mr-2">
                              {String(c.num).padStart(2, "0")}
                            </span>
                            {c.title}
                          </h4>
                          <span className="text-xs text-[var(--pml-prose-muted)] font-mono whitespace-nowrap flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {c.duration}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--pml-prose-muted)] mt-1 leading-relaxed">
                          {c.summary}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
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
                      </div>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Prereq map */}
          <div className="lg:col-span-5">
            <div className="pml-card p-4 h-full">
              <h3 className="text-sm font-semibold mb-3 text-[var(--pml-prose-muted)] uppercase tracking-wider">
                Prerequisite map
              </h3>
              <PrereqGraph />
              <p className="text-xs text-[var(--pml-prose-muted)] mt-3 leading-relaxed">
                Glitch FX (Ch.6) requires both Pixel Sort (Ch.4) and Morphing
                (Ch.5) because the live demo pipeline composes all three. The
                graph updates automatically as you complete chapters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
