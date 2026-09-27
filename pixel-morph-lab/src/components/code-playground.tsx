"use client";

import * as React from "react";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodePlaygroundProps {
  initialCode: string;
  filename?: string;
  description?: string;
  /**
   * `runner` receives the user's code and returns the output to display.
   * It runs inside a sandboxed Function, so we must serialize the result
   * to a string before returning.
   */
  runner?: (code: string) => string;
  /**
   * If runner is not provided, we eval the code in a Function scope and
   * capture `console.log` output + any returned value.
   */
}

/**
 * Tiny code playground — text editor (textarea with mono font) + run button
 * + output panel. Output updates instantly on each "Run" click.
 *
 * For security, user code is wrapped in `new Function(...)` and console.log
 * is intercepted. This is suitable for tutorial demos only.
 */
export function CodePlayground({
  initialCode,
  filename = "playground.ts",
  description,
  runner,
}: CodePlaygroundProps) {
  const [code, setCode] = React.useState(initialCode);
  const [output, setOutput] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [runCount, setRunCount] = React.useState(0);

  const run = () => {
    setRunCount((n) => n + 1);
    setError(null);
    setOutput("");
    try {
      if (runner) {
        const result = runner(code);
        setOutput(result);
        return;
      }
      // Default sandbox: capture console.log
      const logs: string[] = [];
      const fakeConsole = {
        log: (...args: any[]) => {
          logs.push(args.map((a) => stringify(a)).join(" "));
        },
        error: (...args: any[]) => {
          logs.push("Error: " + args.map((a) => stringify(a)).join(" "));
        },
        warn: (...args: any[]) => {
          logs.push("Warn: " + args.map((a) => stringify(a)).join(" "));
        },
      };
      const fn = new Function("console", code);
      const ret = fn(fakeConsole);
      let out = logs.join("\n");
      if (ret !== undefined) {
        out += (out ? "\n" : "") + "→ " + stringify(ret);
      }
      setOutput(out || "(no output)");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  // Auto-run on first mount so the output panel isn't empty
  React.useEffect(() => {
    run();
  }, []);

  return (
    <div className="pml-card overflow-hidden my-6">
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: "var(--pml-border)" }}
      >
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-[#ff5f56]" />
          <span className="inline-block w-2 h-2 rounded-full bg-[#ffbd2e]" />
          <span className="inline-block w-2 h-2 rounded-full bg-[#27c93f]" />
          <span className="ml-2 font-mono text-[var(--pml-prose-muted)]">
            {filename}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCode(initialCode);
              setTimeout(run, 50);
            }}
            className="h-6 px-2 text-[11px]"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
          <Button
            size="sm"
            onClick={run}
            className="h-6 px-2 text-[11px]"
            style={{
              background: "var(--pml-accent)",
              color: "var(--pml-accent-fg)",
            }}
          >
            <Play className="h-3 w-3 mr-1" /> Run
          </Button>
        </div>
      </div>
      {description && (
        <div
          className="px-4 py-2 text-xs italic"
          style={{
            background: "var(--pml-muted)",
            color: "var(--pml-prose-muted)",
            borderBottom: "1px solid var(--pml-border)",
          }}
        >
          {description}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-0">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="code-mono w-full p-3 text-[12.5px] leading-relaxed resize-y min-h-[180px] focus:outline-none bg-transparent"
          style={{ background: "var(--pml-card)", color: "var(--pml-prose)" }}
        />
        <pre
          className="code-mono p-3 text-[12.5px] leading-relaxed overflow-auto scroll-styled min-h-[180px] whitespace-pre-wrap"
          style={{
            background: "var(--pml-muted)",
            color: error ? "#dc2626" : "var(--pml-prose)",
            borderLeft: "1px solid var(--pml-border)",
          }}
        >
          {error ? `✗ ${error}` : output}
          {runCount > 0 && !error && (
            <span
              className="block mt-2 text-[10px] opacity-60"
              style={{ borderTop: "1px dashed var(--pml-border)", paddingTop: 4 }}
            >
              run #{runCount}
            </span>
          )}
        </pre>
      </div>
    </div>
  );
}

function stringify(v: any): string {
  if (v === null) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
