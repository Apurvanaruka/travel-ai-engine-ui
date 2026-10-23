import type { ReactNode } from "react";

export interface BadgeProps {
  tone?: "blue" | "green" | "orange" | "violet" | "slate";
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  blue: "border-acc/40 bg-acc/10 text-acc2",
  green: "border-grn/40 bg-grn/10 text-grn",
  orange: "border-orn/40 bg-orn/10 text-orn",
  violet: "border-vio/40 bg-vio/10 text-vio",
  slate: "border-edge bg-card2 text-mut",
};

/** Small status badge. */
export function Badge({ tone = "blue", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${TONE_CLASSES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
