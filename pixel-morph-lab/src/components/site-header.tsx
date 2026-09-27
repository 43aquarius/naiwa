"use client";

import * as React from "react";
import { Github, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "@/components/ui/badge";

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b"
      style={{
        borderColor: "var(--pml-border)",
        background: "color-mix(in srgb, var(--pml-card) 80%, transparent)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
        <a href="#top" className="flex items-center gap-2 group">
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
            Pixel Morph Lab
          </span>
          <Badge
            variant="outline"
            className="hidden sm:inline-flex text-[10px] py-0 px-1.5 ml-1"
            style={{ borderColor: "var(--pml-border)" }}
          >
            v0.6
          </Badge>
        </a>
        <nav className="hidden md:flex items-center gap-1 text-sm ml-4">
          <a
            href="#series-library"
            className="px-2.5 py-1.5 rounded text-[var(--pml-prose-muted)] hover:text-[var(--pml-prose)] hover:bg-[var(--pml-muted)]"
          >
            Series
          </a>
          <a
            href="#series-detail"
            className="px-2.5 py-1.5 rounded text-[var(--pml-prose-muted)] hover:text-[var(--pml-prose)] hover:bg-[var(--pml-muted)]"
          >
            Chapters
          </a>
          <a
            href="#ch-intro"
            className="px-2.5 py-1.5 rounded text-[var(--pml-prose-muted)] hover:text-[var(--pml-prose)] hover:bg-[var(--pml-muted)]"
          >
            Tutorials
          </a>
          <a
            href="#ch-demo"
            className="px-2.5 py-1.5 rounded text-[var(--pml-prose-muted)] hover:text-[var(--pml-prose)] hover:bg-[var(--pml-muted)] flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3" /> Live Demo
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--pml-prose-muted)]" />
            <Input
              placeholder="Search chapters…"
              className="h-8 w-44 pl-7 text-xs"
              aria-label="Search chapters"
            />
          </div>
          <ThemeToggle />
          <Button asChild variant="outline" size="icon" aria-label="GitHub repository">
            <a href="https://github.com/43aquarius/naiwa" target="_blank" rel="noreferrer">
              <Github className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
