import { airlineColor } from "../../utils/airline";

/** Square airline-code tile used in flight cards. */
export function AirlineSquare({ code, size = 40 }: { code: string; size?: number }) {
  const color = airlineColor(code || "?");
  return (
    <div
      className="grid shrink-0 place-items-center rounded-lg border font-mono font-bold"
      style={{
        width: size,
        height: size,
        color,
        borderColor: `${color}55`,
        background: `${color}1a`,
        fontSize: size * 0.36,
      }}
    >
      {code || "—"}
    </div>
  );
}
