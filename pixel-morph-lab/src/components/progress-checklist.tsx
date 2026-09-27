"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Celebration } from "./celebration";

interface ChecklistItem {
  id: string;
  label: string;
}

interface ProgressChecklistProps {
  items: ChecklistItem[];
}

/**
 * Auto-checks chapters as user finishes them.
 * A chapter is "finished" when >= 80% of it has scrolled past the viewport.
 *
 * Uses IntersectionObserver with threshold calculations.
 */
export function ProgressChecklist({ items }: ProgressChecklistProps) {
  const [done, setDone] = React.useState<Record<string, boolean>>({});
  const [celebrateTrigger, setCelebrateTrigger] = React.useState(0);
  const [lastDoneId, setLastDoneId] = React.useState<string | null>(null);
  const pendingRef = React.useRef<Set<string>>(new Set(items.map((i) => i.id)));

  React.useEffect(() => {
    const observers: IntersectionObserver[] = [];
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (!el) return;
      // Track entry/exit; consider "finished" once >= 80% visible at any point
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio >= 0.8) {
              setDone((prev) => {
                if (prev[it.id]) return prev;
                const next = { ...prev, [it.id]: true };
                setLastDoneId(it.id);
                setCelebrateTrigger((n) => n + 1);
                return next;
              });
            }
          });
        },
        { threshold: [0, 0.4, 0.8, 1] }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  const completedCount = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completedCount / items.length) * 100);

  return (
    <div className="pml-card p-4 relative">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--pml-prose-muted)]">
          Series Progress
        </div>
        <div className="text-xs font-mono text-[var(--pml-accent)]">
          {completedCount}/{items.length} · {pct}%
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--pml-muted)] overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--pml-accent), #fbbf24)",
          }}
        />
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-2 text-sm"
            style={{ opacity: done[it.id] ? 1 : 0.65 }}
          >
            <span
              className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center`}
              style={{
                borderColor: done[it.id]
                  ? "var(--pml-accent)"
                  : "var(--pml-border)",
                background: done[it.id] ? "var(--pml-accent)" : "transparent",
                color: "var(--pml-accent-fg)",
              }}
            >
              {done[it.id] && <Check className="h-3 w-3" strokeWidth={4} />}
            </span>
            <a
              href={`#${it.id}`}
              className="text-[var(--pml-prose-muted)] hover:text-[var(--pml-prose)] truncate"
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
      <Celebration trigger={celebrateTrigger} />
      {lastDoneId && celebrateTrigger > 0 && (
        <div className="sr-only" aria-live="polite">
          Chapter {lastDoneId} completed. Keep going!
        </div>
      )}
    </div>
  );
}
