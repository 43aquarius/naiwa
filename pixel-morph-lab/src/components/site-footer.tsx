import { Github, Sparkles, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t mt-12"
      style={{
        borderColor: "var(--pml-border)",
        background: "var(--pml-muted)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white text-xs font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--pml-accent), #6366f1)",
                }}
              >
                PM
              </span>
              <span className="font-serif font-semibold">Pixel Morph Lab</span>
            </div>
            <p className="text-sm text-[var(--pml-prose-muted)] max-w-md leading-relaxed">
              An open, hands-on tutorial series covering pixel sorting, image
              morphing and canvas-based image processing. Every chapter ships
              with an embedded runnable demo — no setup required.
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--pml-prose-muted)] mb-2">
              Series
            </div>
            <ul className="space-y-1 text-sm">
              <li>
                <a className="hover:underline text-[var(--pml-prose)]" href="#series-library">
                  Pixel Morph Essentials
                </a>
              </li>
              <li>
                <a className="hover:underline text-[var(--pml-prose-muted)]" href="#series-library">
                  Advanced Glitch Art
                </a>
              </li>
              <li>
                <a className="hover:underline text-[var(--pml-prose-muted)]" href="#series-library">
                  Color Theory for Coders
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--pml-prose-muted)] mb-2">
              Community
            </div>
            <ul className="space-y-1 text-sm">
              <li>
                <a
                  className="hover:underline text-[var(--pml-prose-muted)] inline-flex items-center gap-1.5"
                  href="https://github.com/43aquarius/naiwa"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github className="h-3 w-3" /> GitHub
                </a>
              </li>
              <li>
                <a
                  className="hover:underline text-[var(--pml-prose-muted)] inline-flex items-center gap-1.5"
                  href="#comments"
                >
                  <Mail className="h-3 w-3" /> Per-chapter threads
                </a>
              </li>
              <li>
                <a
                  className="hover:underline text-[var(--pml-prose-muted)] inline-flex items-center gap-1.5"
                  href="#ch-demo"
                >
                  <Sparkles className="h-3 w-3" /> Live demo
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t text-xs text-[var(--pml-prose-muted)] flex items-center justify-between flex-wrap gap-2"
          style={{ borderColor: "var(--pml-border)" }}
        >
          <div>
            © {new Date().getFullYear()} Pixel Morph Lab · Released under the
            MIT License
          </div>
          <div className="font-mono">
            Built with Next.js 16 · Tailwind v4 · shadcn/ui
          </div>
        </div>
      </div>
    </footer>
  );
}
