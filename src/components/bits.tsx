/** Small shared visual primitives used across all three screens. */
import type { ReactNode } from "react";
import { Plane } from "lucide-react";
import { AIRLINE_COLORS, AIRLINE_COLOR_FALLBACKS } from "../lib/uiDefaults";

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-dim ${className}`}>
      {children}
    </div>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-edge bg-card2 px-1.5 py-0.5 font-mono text-[11px] text-mut ${className}`}
    >
      {children}
    </span>
  );
}

export function Badge({
  tone = "blue",
  children,
  className = "",
}: {
  tone?: "blue" | "green" | "orange" | "violet" | "slate";
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<string, string> = {
    blue: "border-acc/40 bg-acc/10 text-acc2",
    green: "border-grn/40 bg-grn/10 text-grn",
    orange: "border-orn/40 bg-orn/10 text-orn",
    violet: "border-vio/40 bg-vio/10 text-vio",
    slate: "border-edge bg-card2 text-mut",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-acc/25 border-t-acc ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function airlineColor(code: string): string {
  if (AIRLINE_COLORS[code]) return AIRLINE_COLORS[code];
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return AIRLINE_COLOR_FALLBACKS[h % AIRLINE_COLOR_FALLBACKS.length];
}

export function AirlineSquare({ code, size = 40 }: { code: string; size?: number }) {
  const color = airlineColor(code || "?");
  return (
    <div
      className="grid shrink-0 place-items-center rounded-lg border font-mono font-bold"
      style={{
        width: size,
        height: size,
        color,
        borderColor: `${color}55`,
        background: `${color}1a`,
        fontSize: size * 0.36,
      }}
    >
      {code || "�"}
    </div>
  );
}

/** Horizontal origin?destination line with stop dots and a plane glyph. */
export function RouteLine({
  stops = 0,
  stopCodes = [],
  featured = false,
}: {
  stops?: number;
  stopCodes?: string[];
  featured?: boolean;
}) {
  const dots = Math.min(stops, 3);
  return (
    <div className="relative h-6">
      <div className={`absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded ${featured ? "bg-acc/70" : "bg-edge2"}`} />
      <div className={`absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full ${featured ? "bg-acc2" : "bg-edge2"}`} />
      <div className={`absolute right-0 top-1/2 size-2 -translate-y-1/2 rounded-full ${featured ? "bg-acc2" : "bg-edge2"}`} />
      {Array.from({ length: dots }).map((_, i) => (
        <div
          key={i}
          title={stopCodes[i]}
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orn"
          style={{ left: `${((i + 1) / (dots + 1)) * 100}%` }}
        />
      ))}
      <div
        className={`absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${
          featured ? "bg-card" : "bg-card"
        } px-1`}
      >
        <Plane size={14} className={featured ? "text-acc2" : "text-mut"} style={{ transform: "rotate(45deg)" }} />
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, tone = "acc" }: { value: number; max: number; tone?: "acc" | "grn" }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
      <div
        className={`h-full rounded-full ${tone === "grn" ? "bg-grn" : "bg-acc"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PulseDot({ tone = "grn" }: { tone?: "grn" | "acc" | "orn" }) {
  const color = tone === "grn" ? "bg-grn" : tone === "acc" ? "bg-acc2" : "bg-orn";
  return (
    <span className="relative inline-flex size-2">
      <span className={`absolute inline-flex size-full rounded-full ${color} animate-ping2`} />
      <span className={`relative inline-flex size-2 rounded-full ${color}`} />
    </span>
  );
}
