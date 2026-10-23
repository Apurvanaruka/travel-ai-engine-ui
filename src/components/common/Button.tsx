import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "ghost" | "icon" | "plain";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  icon: "icon-btn",
  plain:
    "inline-flex items-center justify-center gap-2 text-sm font-semibold text-mut transition hover:text-txt",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. Defaults to the blue primary button. */
  variant?: ButtonVariant;
}

/** Shared button element used across every screen. */
export function Button({
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={`${VARIANT_CLASSES[variant]} ${className}`.trim()} {...props} />
  );
}
