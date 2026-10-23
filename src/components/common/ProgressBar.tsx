/** Thin progress bar. */
export function ProgressBar({
  value,
  max,
  tone = "acc",
}: {
  value: number;
  max: number;
  tone?: "acc" | "grn";
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
      <div
        className={`h-full rounded-full ${tone === "grn" ? "bg-grn" : "bg-acc"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
