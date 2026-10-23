import type { ReactNode } from "react";

export type AlertTone = "error" | "warning" | "info" | "success";

const TONE_CLASSES: Record<AlertTone, string> = {
  error: "border-red/40 bg-red/10 text-red",
  warning: "border-orn/40 bg-orn/10 text-orn",
  info: "border-acc/40 bg-acc/10 text-acc2",
  success: "border-grn/40 bg-grn/10 text-grn",
};

export interface AlertProps {
  tone?: AlertTone;
  className?: string;
  children: ReactNode;
}

/** Inline status / validation message. */
export function Alert({ tone = "error", className = "", children }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-lg border px-3 py-2 text-xs ${TONE_CLASSES[tone]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
