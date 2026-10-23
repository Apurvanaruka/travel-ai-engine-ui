import { Plane } from "lucide-react";

/** Horizontal origin → destination line with stop dots and a plane glyph. */
export function RouteLine({
  stops = 0,
  stopCodes = [],
  featured = false,
}: {
  stops?: number;
  stopCodes?: string[];
  featured?: boolean;
}) {
  const dots = Math.min(stops, 3);
  return (
    <div className="relative h-6">
      <div
        className={`absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded ${
          featured ? "bg-acc/70" : "bg-edge2"
        }`}
      />
      <div
        className={`absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full ${
          featured ? "bg-acc2" : "bg-edge2"
        }`}
      />
      <div
        className={`absolute right-0 top-1/2 size-2 -translate-y-1/2 rounded-full ${
          featured ? "bg-acc2" : "bg-edge2"
        }`}
      />
      {Array.from({ length: dots }).map((_, i) => (
        <div
          key={i}
          title={stopCodes[i]}
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orn"
          style={{ left: `${((i + 1) / (dots + 1)) * 100}%` }}
        />
      ))}
      <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card px-1">
        <Plane
          size={14}
          className={featured ? "text-acc2" : "text-mut"}
          style={{ transform: "rotate(45deg)" }}
        />
      </div>
    </div>
  );
}
