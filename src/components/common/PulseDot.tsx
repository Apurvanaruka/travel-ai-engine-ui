/** Pulsing status dot. */
export function PulseDot({ tone = "grn" }: { tone?: "grn" | "acc" | "orn" }) {
  const color = tone === "grn" ? "bg-grn" : tone === "acc" ? "bg-acc2" : "bg-orn";
  return (
    <span className="relative inline-flex size-2">
      <span className={`absolute inline-flex size-full rounded-full ${color} animate-ping2`} />
      <span className={`relative inline-flex size-2 rounded-full ${color}`} />
    </span>
  );
}
