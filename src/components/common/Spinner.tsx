/** Accessible loading spinner. */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-acc/25 border-t-acc ${className}`.trim()}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
