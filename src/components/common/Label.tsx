import type { ReactNode } from "react";

/** Uppercase section label. */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-dim ${className}`.trim()}
    >
      {children}
    </div>
  );
}
