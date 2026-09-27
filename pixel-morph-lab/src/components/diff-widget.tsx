"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { GitCompare } from "lucide-react";

interface DiffWidgetProps {
  before: string;
  after: string;
  language?: string;
  filename?: string;
}

interface DiffLine {
  type: "add" | "del" | "ctx";
  beforeText?: string;
  afterText?: string;
}

/**
 * Compute a line-level diff between two code strings.
 * Simple LCS — good enough for short tutorial snippets.
 */
function computeDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const m = a.length;
  const n = b.length;
  // dp[i][j] = longest common subsequence length up to a[i], b[j]
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: "ctx", beforeText: a[i], afterText: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", beforeText: a[i] });
      i++;
    } else {
      out.push({ type: "add", afterText: b[j] });
      j++;
    }
  }
  while (i < m) {
    out.push({ type: "del", beforeText: a[i] });
    i++;
  }
  while (j < n) {
    out.push({ type: "add", afterText: b[j] });
    j++;
  }
  return out;
}

/**
 * Diff widget — animates from before-code to after-code on click.
 * Two modes:
 *  - "before": shows only deletions + context (the original code)
 *  - "after": shows only additions + context (the new code)
 *  - "diff": shows the full unified diff (del + ctx + add)
 *
 * Clicking toggles through the modes.
 */
export function DiffWidget({
  before,
  after,
  language = "ts",
  filename = "snippet.ts",
}: DiffWidgetProps) {
  const diffLines = React.useMemo(() => computeDiff(before, after), [
    before,
    after,
  ]);
  const [mode, setMode] = React.useState<"before" | "after" | "diff">("before");

  const visibleLines = React.useMemo(() => {
    if (mode === "before") {
      return diffLines.map((l) => ({
        type: l.type === "add" ? "del" : (l.type as "ctx" | "del"),
        text: l.beforeText ?? l.afterText ?? "",
      }));
    }
    if (mode === "after") {
      return diffLines.map((l) => ({
        type: l.type === "del" ? "add" : (l.type as "ctx" | "add"),
        text: l.afterText ?? l.beforeText ?? "",
      }));
    }
    // diff mode: show every line with proper sign
    return diffLines.map((l) => {
      if (l.type === "add") return { type: "add" as const, text: l.afterText ?? "" };
      if (l.type === "del") return { type: "del" as const, text: l.beforeText ?? "" };
      return { type: "ctx" as const, text: l.beforeText ?? "" };
    });
  }, [mode, diffLines]);

  return (
    <div className="pml-card overflow-hidden my-6">
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: "var(--pml-border)" }}
      >
        <div className="flex items-center gap-2 text-xs">
          <GitCompare className="h-3.5 w-3.5 opacity-60" />
          <span className="font-mono text-[var(--pml-prose-muted)]">{filename}</span>
          <span className="opacity-50">·</span>
          <span className="text-[var(--pml-prose-muted)]">{language}</span>
        </div>
        <div className="flex gap-1">
          {(["before", "diff", "after"] as const).map((m) => {
            const isActive = mode === m;
            return (
              <Button
                key={m}
                size="sm"
                variant={isActive ? "default" : "ghost"}
                onClick={() => setMode(m)}
                className="h-6 px-2 text-[11px] font-mono"
              >
                {m}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto scroll-styled" style={{ maxHeight: 360 }}>
        {visibleLines.map((line, idx) => (
          <div key={idx} className={`diff-line ${line.type}`}>
            <span className="diff-sign">
              {line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
            </span>
            <span>{line.text || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
