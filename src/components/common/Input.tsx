import { forwardRef, type InputHTMLAttributes } from "react";

export type InputVariant = "default" | "bare" | "filter";

const VARIANT_CLASSES: Record<InputVariant, string> = {
  /** Form input on a muted inset surface. */
  default: "inset w-full text-txt outline-none focus:border-acc/60",
  /** Chrome-less input used inside composite controls (e.g. the composer). */
  bare: "min-w-0 flex-1 bg-transparent text-txt outline-none placeholder:text-dim",
  /** Compact control used in filter bars. */
  filter: "filter-control",
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
}

/** Shared text input primitive. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = "default", className = "", ...props },
  ref,
) {
  return (
    <input ref={ref} className={`${VARIANT_CLASSES[variant]} ${className}`.trim()} {...props} />
  );
});
