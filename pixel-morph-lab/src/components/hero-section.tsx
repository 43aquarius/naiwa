"use client";

import * as React from "react";
import { Sparkles, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section
      id="top"
      className="hero-gradient border-b"
      style={{ borderColor: "var(--pml-border)" }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left — featured series banner */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-4">
              <Badge
                className="text-[10px] py-0.5"
                style={{
                  background: "var(--pml-accent)",
                  color: "var(--pml-accent-fg)",
                }}
              >
                FEATURED SERIES
              </Badge>
              <span className="text-xs text-[var(--pml-prose-muted)] font-mono">
                series · 6 chapters · 1h 45m
              </span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Pixel Morph,{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, var(--pml-accent), #6366f1)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                from smile_01 to smile_06
              </span>
            </h1>
            <p className="mt-5 text-[var(--pml-prose-muted)] text-lg font-serif max-w-2xl leading-relaxed">
              A hands-on tutorial series on pixel sorting, image morphing, and
              glitch art — every chapter ships with an embedded runnable demo.
              Default canvas: the gentle smile_01 morphing into the ecstatic
              smile_06. Bring your own images too.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                style={{
                  background: "var(--pml-accent)",
                  color: "var(--pml-accent-fg)",
                }}
              >
                <a href="#ch-demo">
                  <Sparkles className="h-4 w-4 mr-2" /> Open the live demo
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#ch-intro">
                  Start the tutorial <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>

          {/* Right — small "new chapters this week" cards */}
          <div className="lg:col-span-5">
            <div className="pml-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-[var(--pml-accent)]" />
                <span className="text-sm font-semibold">New this week</span>
              </div>
              <ul className="space-y-2.5">
                {WEEK_CHAPTERS.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      className="flex items-start gap-3 p-2 rounded hover:bg-[var(--pml-muted)] transition-colors group"
                    >
                      <div
                        className="flex-shrink-0 w-9 h-9 rounded text-xs font-mono font-bold flex items-center justify-center"
                        style={{
                          background: "var(--pml-muted)",
                          color: "var(--pml-accent)",
                        }}
                      >
                        {c.id.split("-")[1]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--pml-prose)] truncate group-hover:text-[var(--pml-accent)]">
                          {c.title}
                        </div>
                        <div className="text-xs text-[var(--pml-prose-muted)]">
                          {c.duration} · {c.tag}
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const WEEK_CHAPTERS = [
  {
    id: "ch-pixelbuf",
    title: "Pixel Buffers & Typed Arrays",
    duration: "12 min",
    tag: "fundamentals",
  },
  {
    id: "ch-sort",
    title: "Pixel Sorting by Brightness",
    duration: "18 min",
    tag: "hands-on",
  },
  {
    id: "ch-morph",
    title: "Cross-dissolve Morphing",
    duration: "15 min",
    tag: "hands-on",
  },
  {
    id: "ch-pipeline",
    title: "Composing Sort + Morph + Glitch",
    duration: "20 min",
    tag: "advanced",
  },
];
