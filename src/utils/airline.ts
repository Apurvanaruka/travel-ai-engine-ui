import { AIRLINE_COLORS, AIRLINE_COLOR_FALLBACKS } from "./uiDefaults";

/** Stable airline brand colour with a deterministic fallback per code. */
export function airlineColor(code: string): string {
  if (AIRLINE_COLORS[code]) return AIRLINE_COLORS[code];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return AIRLINE_COLOR_FALLBACKS[hash % AIRLINE_COLOR_FALLBACKS.length];
}
