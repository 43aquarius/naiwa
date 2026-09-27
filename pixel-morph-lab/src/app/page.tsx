"use client";

import * as React from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSection } from "@/components/hero-section";
import { SeriesLibrary } from "@/components/series-library";
import { SeriesDetail } from "@/components/series-detail";
import { ChapterSection } from "@/components/chapter-section";
import { StickyToc, type TocItem } from "@/components/sticky-toc";
import { ProgressChecklist } from "@/components/progress-checklist";
import { CodePlayground } from "@/components/code-playground";
import { DiffWidget } from "@/components/diff-widget";
import { PixelTransformDemo } from "@/components/pixel-transform-demo";
import { Sparkles, ListChecks, BookOpen } from "lucide-react";

export default function Home() {
  const tocItems: TocItem[] = React.useMemo(
    () => [
      { id: "ch-intro", label: "01 — Why pixel morph matters", level: 1 },
      { id: "ch-canvas", label: "02 — The Canvas 2D API", level: 1 },
      { id: "ch-pixelbuf", label: "03 — Pixel buffers & typed arrays", level: 1 },
      { id: "ch-sort", label: "04 — Pixel sorting by brightness", level: 1 },
      { id: "ch-morph", label: "05 — Cross-dissolve morphing", level: 1 },
      { id: "ch-demo", label: "06 — Live demo: full pipeline", level: 1 },
      { id: "comments-ch-demo", label: "Discussion", level: 2 },
    ],
    []
  );

  const checklistItems = React.useMemo(
    () => [
      { id: "ch-intro", label: "Ch.1 — Intro" },
      { id: "ch-canvas", label: "Ch.2 — Canvas API" },
      { id: "ch-pixelbuf", label: "Ch.3 — Pixel Buffers" },
      { id: "ch-sort", label: "Ch.4 — Pixel Sort" },
      { id: "ch-morph", label: "Ch.5 — Morphing" },
      { id: "ch-demo", label: "Ch.6 — Live Demo" },
    ],
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <SeriesLibrary />
        <SeriesDetail />

        {/* Chapters — two-column layout: sticky TOC + content */}
        <section
          id="chapters"
          className="py-12"
          style={{ scrollMarginTop: "5rem" }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen className="h-4 w-4 text-[var(--pml-accent)]" />
                <span className="text-xs uppercase tracking-wider font-semibold text-[var(--pml-prose-muted)]">
                  Tutorial
                </span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
                Pixel Morph Essentials — the chapters
              </h2>
              <p className="text-[var(--pml-prose-muted)] text-sm mt-1.5 max-w-2xl leading-relaxed">
                Read top to bottom, or jump around using the table of contents.
                Each chapter card auto-marks itself complete once you scroll
                past 80% of it.
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
              {/* Left — sticky TOC + progress checklist */}
              <aside className="lg:col-span-3">
                <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scroll-styled pr-1">
                  <StickyToc items={tocItems} />
                  <ProgressChecklist items={checklistItems} />
                  <div className="pml-card p-3 text-[11px] text-[var(--pml-prose-muted)] leading-relaxed">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--pml-prose)] mb-1">
                      <ListChecks className="h-3 w-3" /> Auto-track
                    </div>
                    Reading is detected by scroll depth — no login, no
                    tracking, no cookies. Reload anytime; your progress is
                    per-session.
                  </div>
                </div>
              </aside>

              {/* Right — chapter content */}
              <div className="lg:col-span-9 min-w-0">
                {/* Ch.1 — Intro */}
                <ChapterSection
                  id="ch-intro"
                  num={1}
                  title="Why pixel morph matters"
                  duration="8 min"
                >
                  <p>
                    Pixel sorting and image morphing sit at the intersection of
                    generative art, glitch aesthetics, and image processing.
                    The classic <code>pixel sort</code> effect — popularized by
                    Jeff Andrews in the late 2000s — treats each row (or column)
                    of pixels as an array and reorders it by some scalar metric
                    such as <em>brightness</em>, <em>hue</em>, or{" "}
                    <em>saturation</em>. The result feels like the image is{" "}
                    <em>melting</em> along its dominant gradient.
                  </p>
                  <p>
                    Morphing is older still — it goes back to the early-1990s
                    Hollywood VFX industry (Willow, Terminator 2, Michael
                    Jackson&apos;s Black or White video). The simplest variant
                    is a <strong>cross-dissolve</strong>: interpolate every
                    pixel between a source image and a target image at a
                    parameter <code>t ∈ [0, 1]</code>. At t=0 you have the
                    source; at t=1 you have the target; in between, you get a
                    translucent blend.
                  </p>
                  <p>
                    In this series we pair both ideas. The default demo loads{" "}
                    <code>smile_01.png</code> (a calm face) and{" "}
                    <code>smile_06.png</code> (an extreme grin), and lets you
                    cross-dissolve between them at any amount, optionally
                    pre-sorting the pixels for a more chaotic look.
                  </p>
                  <p>
                    The series assumes you know basic JavaScript and have a
                    passing familiarity with the DOM. Everything else — the
                    Canvas API, typed arrays, color metrics, easing — is
                    explained inline with runnable examples.
                  </p>
                </ChapterSection>

                {/* Ch.2 — Canvas API */}
                <ChapterSection
                  id="ch-canvas"
                  num={2}
                  title="The Canvas 2D API"
                  duration="12 min"
                >
                  <p>
                    The HTML <code>&lt;canvas&gt;</code> element is our
                    workbench. It exposes a 2D context with a small but
                    powerful set of methods for drawing shapes, images and
                    text. For pixel work, the two methods that matter are{" "}
                    <code>getImageData(x, y, w, h)</code> and{" "}
                    <code>putImageData(imgData, x, y)</code>.
                  </p>
                  <p>
                    <code>getImageData</code> returns an{" "}
                    <code>ImageData</code> object whose <code>data</code>{" "}
                    property is a flat <code>Uint8ClampedArray</code> of length{" "}
                    <code>w × h × 4</code> — four bytes per pixel, in RGBA order.
                    Writing to that array and calling <code>putImageData</code>{" "}
                    is the only way to manipulate pixels at full speed.
                  </p>
                  <p>
                    One critical caveat: if you load an image from a different
                    origin without setting <code>crossOrigin=&quot;anonymous&quot;</code>{" "}
                    and getting proper CORS headers from the server, the canvas
                    becomes <em>tainted</em> and <code>getImageData</code>{" "}
                    throws a SecurityError. Always serve images from the same
                    origin (or a properly CORS-enabled bucket) when you plan to
                    read pixels.
                  </p>
                </ChapterSection>

                {/* Ch.3 — Pixel Buffers */}
                <ChapterSection
                  id="ch-pixelbuf"
                  num={3}
                  title="Pixel buffers & typed arrays"
                  duration="14 min"
                >
                  <p>
                    JavaScript typed arrays — like{" "}
                    <code>Uint8Array</code>, <code>Float32Array</code> and the
                    slightly unusual <code>Uint8ClampedArray</code> — are the
                    way to represent dense numeric data without per-element
                    boxing. A 400×400 RGBA image is 640,000 bytes; that would be
                    ~1.6M JavaScript numbers and ~64MB of memory if stored in
                    a regular array. A typed array packs it into the actual
                    640KB.
                  </p>
                  <p>
                    <code>Uint8ClampedArray</code> is the typed array returned
                    by <code>getImageData</code>. Its only special behavior is
                    that assignments are clamped to <code>[0, 255]</code> (so
                    writing <code>-20</code> stores <code>0</code>, and{" "}
                    <code>300</code> stores <code>255</code>). This is handy
                    when blending, because you can write the raw math without
                    bounds-checking afterwards.
                  </p>
                  <p>
                    Try editing the code below — change the channel multiplier
                    and watch the output update instantly. The image used is
                    the calm <code>smile_01.png</code> from the demo folder.
                  </p>
                </ChapterSection>

                {/* Ch.4 — Pixel Sort (with diff widget) */}
                <ChapterSection
                  id="ch-sort"
                  num={4}
                  title="Pixel sorting by brightness"
                  duration="18 min"
                  aside={
                    <DiffWidget
                      filename="pixel-sort.ts"
                      language="typescript"
                      before={`// Naive per-row sort — O(n log n) per row, no threshold
function pixelSortNaive(buf) {
  const out = new Uint8ClampedArray(buf.data);
  for (let y = 0; y < buf.height; y++) {
    const row = [];
    for (let x = 0; x < buf.width; x++) {
      const i = (y * buf.width + x) * 4;
      row.push(buf.data.subarray(i, i + 4));
    }
    row.sort((a, b) => brightness(b) - brightness(a));
    for (let x = 0; x < row.length; x++) {
      const i = (y * buf.width + x) * 4;
      out.set(row[x], i);
    }
  }
  return { ...buf, data: out };
}`}
                      after={`// Production: threshold-banded sort with intensity lerp
function pixelSort(buf, params) {
  const { direction, metric, threshold, intensity } = params;
  const passes = Math.max(1, Math.round(intensity * 4));
  let current = buf;
  for (let p = 0; p < passes; p++) {
    current = pixelSortPass(current, params);
  }
  return current;
}`}
                    />
                  }
                >
                  <p>
                    The classic pixel-sort algorithm walks each row of the
                    image, sorts its pixels by some metric (brightness is the
                    default), and writes them back. The naive version is short
                    but slow — it sorts every pixel even when most of the row
                    is background.
                  </p>
                  <p>
                    The production version introduces two ideas: a{" "}
                    <strong>threshold band</strong> (only sort pixels whose
                    metric falls in a configurable range) and an{" "}
                    <strong>intensity lerp</strong> (blend between the original
                    and the sorted result, so intensity=0 is the original image
                    and intensity=1 is fully sorted).
                  </p>
                  <p>
                    The diff widget below shows the before/after code. Toggle
                    the <code>before</code> / <code>diff</code> /{" "}
                    <code>after</code> tabs to see the evolution.
                  </p>
                </ChapterSection>

                {/* Ch.5 — Morph (with code playground) */}
                <ChapterSection
                  id="ch-morph"
                  num={5}
                  title="Cross-dissolve morphing"
                  duration="15 min"
                  aside={
                    <CodePlayground
                      filename="morph.ts"
                      description="Try changing the easing function — output updates instantly when you click Run."
                      initialCode={`// Linear cross-dissolve between two same-sized RGBA buffers
function morph(src, dst, t) {
  // t ∈ [0, 1] — 0 = pure source, 1 = pure target
  const out = new Uint8ClampedArray(src.data.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = src.data[i] * (1 - t) + dst.data[i] * t;
  }
  return { ...src, data: out };
}

// Try easing — uncomment to switch from linear to ease-in-out
// const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;

// Sample source / target brightness at 8 sample points
const s = new Array(8).fill(120);   // calm smile_01: dim
const d = new Array(8).fill(220);    // happy smile_06: bright

for (let i = 0; i <= 7; i++) {
  const t = i / 7;
  // linear lerp
  const v = morph({ data: new Uint8ClampedArray(s.map(x=>x)), width: 8, height: 1 },
                  { data: new Uint8ClampedArray(d.map(x=>x)), width: 8, height: 1 }, t);
  console.log(\`t=\${t.toFixed(2)}  → \${Math.round(v.data[0])}\`);
}
`}
                    />
                  }
                >
                  <p>
                    Cross-dissolve morphing is the simplest image-morph that
                    still looks pleasing. Given two buffers of identical
                    dimensions, you produce a new buffer where every channel of
                    every pixel is the linear interpolation of the
                    corresponding source and target values.
                  </p>
                  <p>
                    The math is just <code>out = src × (1−t) + dst × t</code>{" "}
                    where <code>t</code> is the morph amount. The interesting
                    design choice is <em>easing</em>. A linear ease feels
                    mechanical; an ease-in-out eases through the middle 50%,
                    which feels more like a held-breath transition.
                  </p>
                  <p>
                    The playground below lets you play with the morph math
                    without leaving the page. Try replacing the linear lerp
                    with an eased one and watch the output column change shape.
                  </p>
                </ChapterSection>

                {/* Ch.6 — Live Demo */}
                <ChapterSection
                  id="ch-demo"
                  num={6}
                  title="Live demo: full pixel-transform pipeline"
                  duration="20 min"
                  aside={
                    <>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[var(--pml-accent)] mb-2">
                        <Sparkles className="h-3.5 w-3.5" /> Run it live
                      </div>
                      <PixelTransformDemo />
                    </>
                  }
                >
                  <p>
                    The final chapter puts everything together: a single
                    pipeline that loads two images (defaulting to{" "}
                    <code>smile_01.png</code> and <code>smile_06.png</code>),
                    optionally pixel-sorts the source, cross-dissolves into the
                    target at a chosen amount, and finally applies a
                    block-shift glitch.
                  </p>
                  <p>
                    You can pick which stage to enable via the tabs (Sort /{" "}
                    Morph / Glitch / Pipeline), or flip on{" "}
                    <em>Pipeline</em> mode to run all three in sequence. Upload
                    your own PNG or JPG via the Source and Target buttons — the
                    pipeline will resize the second image to match the first
                    automatically.
                  </p>
                  <p>
                    A few suggestions to try: (1) Sort with{" "}
                    <em>vertical</em> direction + <em>hue</em> metric at{" "}
                    <em>intensity 100%</em>. (2) Morph at 70% with ease-in-out.
                    (3) Pipeline mode with sort-before-morph on, then crank
                    glitch block-count to 30 for an aggressive datamosh.
                  </p>
                  <p>
                    Once you find a frame you like, hit{" "}
                    <em>Download PNG</em> — the canvas is exported at full
                    resolution (up to 400px on the longest side for
                    performance).
                  </p>
                </ChapterSection>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
