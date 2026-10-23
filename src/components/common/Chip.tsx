import type { ReactNode } from "react";

/** Compact monospace chip used for carrier codes, seats, etc. */
export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-edge bg-card2 px-1.5 py-0.5 font-mono text-[11px] text-mut ${className}`.trim()}
    >
      {children}
    </span>
  );
}
