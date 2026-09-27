"use client";

import * as React from "react";

export interface TocItem {
  id: string;
  label: string;
  level: number; // 1, 2, 3 (heading depth)
}

interface StickyTocProps {
  items: TocItem[];
}

/**
 * Sticky table-of-contents that highlights the active heading based on scroll.
 */
export function StickyToc({ items }: StickyTocProps) {
  const [activeId, setActiveId] = React.useState<string>(items[0]?.id ?? "");

  React.useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry that's most prominently visible
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="text-sm" aria-label="Table of contents">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--pml-prose-muted)] mb-2 px-3">
        On this page
      </div>
      <ul className="space-y-0.5">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`toc-link ${activeId === it.id ? "active" : ""}`}
              style={{ paddingLeft: `${0.75 + (it.level - 1) * 0.6}rem` }}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
