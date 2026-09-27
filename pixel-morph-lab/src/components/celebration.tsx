"use client";

import * as React from "react";
import { Check } from "lucide-react";

interface CelebrationProps {
  trigger: number; // increment to fire the animation
}

/**
 * Celebration animation: gold tick pop + confetti + soft chime.
 * Mounted once per chapter card; parent bumps `trigger` to replay.
 */
export function Celebration({ trigger }: CelebrationProps) {
  const [show, setShow] = React.useState(false);
  const prevRef = React.useRef(0);

  React.useEffect(() => {
    if (trigger > prevRef.current) {
      prevRef.current = trigger;
      setShow(true);
      // Soft chime via WebAudio (no asset needed)
      try {
        const Ctx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            osc.type = "sine";
            osc.connect(gain);
            gain.connect(ctx.destination);
            const t0 = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
            osc.start(t0);
            osc.stop(t0 + 0.45);
          });
          // Auto-close the audio context
          setTimeout(() => ctx.close(), 800);
        }
      } catch {
        // ignore audio errors
      }
      const t = setTimeout(() => setShow(false), 1400);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  if (!show) return null;

  const confetti = Array.from({ length: 14 });
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <div
        className="celebrate-tick"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 48,
          height: 48,
          marginTop: -24,
          marginLeft: -24,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
          boxShadow: "0 6px 24px rgba(245, 158, 11, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          zIndex: 50,
        }}
      >
        <Check className="h-7 w-7" strokeWidth={3} />
      </div>
      {confetti.map((_, i) => {
        const angle = (i / confetti.length) * Math.PI * 2;
        const x = Math.cos(angle) * 50;
        const y = Math.sin(angle) * 50;
        const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6"];
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: -4,
              marginLeft: -4,
              width: 8,
              height: 8,
              transform: `translate(${x}px, ${y}px)`,
              background: colors[i % colors.length],
              borderRadius: i % 3 === 0 ? "50%" : "2px",
              animationDelay: `${i * 0.04}s`,
            }}
          />
        );
      })}
    </div>
  );
}
