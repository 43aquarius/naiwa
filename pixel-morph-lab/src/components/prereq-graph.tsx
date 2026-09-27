"use client";

import * as React from "react";

interface PrereqNode {
  id: string;
  label: string;
  x: number; // 0..100 (percent within svg viewport)
  y: number;
  deps: string[]; // ids this node depends on
  status?: "available" | "completed" | "locked";
}

const NODES: PrereqNode[] = [
  { id: "intro", label: "Ch.1 — Intro", x: 12, y: 30, deps: [], status: "completed" },
  { id: "canvas", label: "Ch.2 — Canvas API", x: 38, y: 18, deps: ["intro"], status: "completed" },
  { id: "pixelbuf", label: "Ch.3 — Pixel Buffers", x: 38, y: 56, deps: ["intro"], status: "completed" },
  { id: "sort", label: "Ch.4 — Pixel Sort", x: 64, y: 18, deps: ["canvas", "pixelbuf"], status: "available" },
  { id: "morph", label: "Ch.5 — Morphing", x: 64, y: 56, deps: ["pixelbuf"], status: "available" },
  { id: "glitch", label: "Ch.6 — Glitch FX", x: 88, y: 38, deps: ["sort", "morph"], status: "locked" },
];

const COLORS = {
  completed: "#22c55e",
  available: "#d97757",
  locked: "#94a3b8",
  edge: "#cbd5e1",
};

/**
 * Interactive node-graph of chapter prerequisites.
 * - Hover to highlight a node and its edges
 * - Click to "select" (visual ripple)
 */
export function PrereqGraph() {
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <div
      className="pml-card p-4"
      role="img"
      aria-label="Prerequisite map of chapters"
    >
      <svg viewBox="0 0 100 80" className="w-full h-56">
        <defs>
          <marker
            id="arrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill={COLORS.edge} />
          </marker>
        </defs>
        {/* edges */}
        {NODES.flatMap((n) =>
          n.deps.map((depId) => {
            const dep = NODES.find((x) => x.id === depId)!;
            const isActive =
              hovered === n.id || hovered === dep.id || selected === n.id || selected === dep.id;
            const x1 = dep.x;
            const y1 = dep.y;
            const x2 = n.x;
            const y2 = n.y;
            // simple quadratic curve
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2 - 6;
            return (
              <path
                key={`${dep.id}->${n.id}`}
                d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                stroke={isActive ? COLORS.available : COLORS.edge}
                strokeWidth={isActive ? 0.7 : 0.4}
                fill="none"
                markerEnd="url(#arrow)"
                opacity={isActive ? 1 : 0.6}
              />
            );
          })
        )}
        {/* nodes */}
        {NODES.map((n) => {
          const status = n.status ?? "available";
          const fill = COLORS[status];
          const isDim =
            (hovered && hovered !== n.id && !n.deps.includes(hovered) &&
              !NODES.find((x) => x.deps.includes(n.id))?.id.includes(hovered ?? "")) ||
            false;
          return (
            <g
              key={n.id}
              className="prereq-node"
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(n.id)}
              opacity={isDim ? 0.35 : 1}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={4.5}
                fill={fill}
                stroke="white"
                strokeWidth={0.8}
                filter={selected === n.id ? "url(#shadow)" : undefined}
              />
              <text
                x={n.x}
                y={n.y + 8}
                textAnchor="middle"
                fontSize={3.4}
                fill="var(--pml-prose)"
                fontWeight={hovered === n.id ? 700 : 500}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs">
        <Legend color={COLORS.completed} label="Completed" />
        <Legend color={COLORS.available} label="Available" />
        <Legend color={COLORS.locked} label="Locked" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-[var(--pml-prose-muted)]">{label}</span>
    </div>
  );
}
