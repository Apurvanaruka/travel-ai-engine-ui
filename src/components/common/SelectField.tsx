import { useId, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
}

export type SelectVariant = "default" | "filter";
export type SelectSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<SelectVariant, string> = {
  default: "inset w-full text-txt outline-none focus:border-acc/60",
  filter: "filter-control",
};

const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: "px-3 py-2 text-[12.5px]",
  md: "px-3 py-2.5 text-sm",
  lg: "px-3.5 py-3 text-base",
};

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  options?: SelectOption[];
  variant?: SelectVariant;
  /** Padding / text size preset for the default variant. */
  size?: SelectSize;
  /** Class applied to the wrapping element (not the select itself). */
  wrapperClassName?: string;
}

/** Shared labelled select control. */
export function SelectField({
  label,
  options,
  variant = "default",
  size = "md",
  id,
  wrapperClassName = "",
  className = "",
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const wrapperClass =
    variant === "filter" ? `flex items-center gap-2 ${wrapperClassName}`.trim() : wrapperClassName;
  const sizeClass = variant === "default" ? SIZE_CLASSES[size] : "";

  return (
    <div className={wrapperClass}>
      {label && (
        <label
          htmlFor={selectId}
          className={
            variant === "filter" ? "hidden text-xs font-medium text-dim sm:block" : "field-label"
          }
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`${VARIANT_CLASSES[variant]} ${sizeClass} ${className}`.trim()}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    </div>
  );
}
