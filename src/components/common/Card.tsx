import type { HTMLAttributes } from "react";

/** Surface card with the shared border, radius and shadow treatment. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`.trim()} {...props} />;
}
