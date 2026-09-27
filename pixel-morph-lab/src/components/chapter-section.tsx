"use client";

import * as React from "react";
import { CommentsSection } from "./comments-section";

interface ChapterSectionProps {
  id: string;
  num: number;
  title: string;
  duration: string;
  /** Body rendered inside `.prose-serif`. Each item is a paragraph or
   * a special directive: { kind: 'h', text, level } | { kind: 'p', text } | JSX */
  children: React.ReactNode;
  /** Toggleable code-walkthrough content under the prose */
  aside?: React.ReactNode;
}

/**
 * Chapter section wrapper.
 * Wraps prose + optional aside (code playground, diff widget, etc.)
 * in a section with an anchored heading.
 *
 * The heading's scroll-margin-top is handled by .prose-serif h2/h3 styles.
 */
export function ChapterSection({
  id,
  num,
  title,
  duration,
  children,
  aside,
}: ChapterSectionProps) {
  return (
    <section
      id={id}
      className="py-10 border-b last:border-0"
      style={{ borderColor: "var(--pml-border)", scrollMarginTop: "5rem" }}
    >
      <header className="flex items-baseline gap-3 mb-6">
        <span
          className="font-mono text-sm text-[var(--pml-accent)] flex-shrink-0"
          aria-hidden
        >
          {String(num).padStart(2, "0")} ·
        </span>
        <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
          {title}
        </h2>
        <span className="ml-auto text-xs text-[var(--pml-prose-muted)] font-mono whitespace-nowrap">
          ~{duration}
        </span>
      </header>
      <div className="prose-serif">{children}</div>
      {aside && <div className="mt-6">{aside}</div>}
      <CommentsSection chapterId={id} chapterTitle={title} />
    </section>
  );
}
