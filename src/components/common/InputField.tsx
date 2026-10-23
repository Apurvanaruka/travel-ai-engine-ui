import { useId } from "react";
import { Input, type InputProps } from "./Input";

export type FieldSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<FieldSize, string> = {
  sm: "px-3 py-2 text-[12.5px]",
  md: "px-3 py-2.5 text-sm",
  lg: "px-3.5 py-3 text-base",
};

export interface InputFieldProps extends Omit<InputProps, "size"> {
  /** Visible field label. */
  label?: string;
  /** Helper text shown below the input. */
  hint?: string;
  /** Validation message; replaces the hint and marks the field invalid. */
  error?: string;
  /** Padding / text size preset. Defaults to the standard form size. */
  size?: FieldSize;
  /** Class applied to the wrapping element (not the input itself). */
  wrapperClassName?: string;
}

/**
 * Label + input + helper/error text. Use this everywhere a labelled form
 * field is needed instead of re-creating the markup per screen.
 */
export function InputField({
  label,
  hint,
  error,
  size = "md",
  id,
  wrapperClassName = "",
  className = "",
  ...props
}: InputFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <Input
        id={inputId}
        className={`${SIZE_CLASSES[size]} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-[11px] text-red">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-dim">{hint}</p>
      ) : null}
    </div>
  );
}
