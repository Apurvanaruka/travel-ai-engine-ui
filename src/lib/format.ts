/**
 * Display helpers ported from the Streamlit reference client
 * (_price / _time_of / _duration_str / _carrier_label / row builders),
 * plus an indicative corporate-desk currency conversion for the
 * USD / INR / EUR toggle in the topbar.
 */
import type { FlightQuote, HotelQuote } from "./types";
import { INDICATIVE_FX_FROM_USD } from "./uiDefaults";

export type CurrencyCode = "USD" | "INR" | "EUR";

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  USD: "$",
  INR: "?",
  EUR: "�",
};

/** Indicative corporate desk rates (1 USD base). Display-only fallbacks. */
const FX_FROM_USD: Record<CurrencyCode, number> = INDICATIVE_FX_FROM_USD;

export function convert(amount: number, from: string, to: CurrencyCode): number {
  const fromRate = FX_FROM_USD[(from.toUpperCase() as CurrencyCode) in FX_FROM_USD ? (from.toUpperCase() as CurrencyCode) : "USD"];
  const usd = amount / (fromRate || 1);
  return usd * FX_FROM_USD[to];
}

export function money(amount: number | null | undefined, from: string | null | undefined, to: CurrencyCode): string {
  if (amount === null || amount === undefined) return "�";
  const value = convert(amount, from ?? "USD", to);
  const symbol = CURRENCY_SYMBOL[to];
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: value >= 1000 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function moneyExact(amount: number | null | undefined, from: string | null | undefined, to: CurrencyCode): string {
  if (amount === null || amount === undefined) return "�";
  const value = convert(amount, from ?? "USD", to);
  return `${CURRENCY_SYMBOL[to]}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** HH:MM from an ISO-ish datetime string ('2026-10-29T21:35'). */
export function timeOf(value?: string | null): string | null {
  if (!value) return null;
  const part = String(value).split("T")[1];
  return part ? part.slice(0, 5) : null;
}

export function dateOf(value?: string | null): string | null {
  if (!value) return null;
  return String(value).split("T")[0] || null;
}

export function durationStr(minutes?: number | null): string {
  if (minutes === null || minutes === undefined) return "�";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** 'EK501' from airline 'EK' + flight '501' / 'EK 501'. */
export function carrierLabel(airline?: string | null, flightNumber?: string | null): string {
  if (!flightNumber) return airline || "";
  const number = String(flightNumber).trim().replace(/\s+/g, "").toUpperCase();
  if (airline) {
    if (number.startsWith(airline.toUpperCase())) return number;
    return `${airline.toUpperCase()}${number}`;
  }
  return number;
}

/** '+1 Day' style arrival offset badge, or null when same-day. */
export function dayOffset(dep?: string | null, arr?: string | null): string | null {
  const d = dateOf(dep);
  const a = dateOf(arr);
  if (!d || !a) return null;
  const days = Math.round((Date.parse(a) - Date.parse(d)) / 86_400_000);
  if (!days) return null;
  return days > 0 ? `+${days} Day` : `${days} Day`;
}

export function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Passenger counts from the fare breakdown ('total for 2 adults'). */
export function paxSummary(quote: FlightQuote): string {
  const parts = (quote.fare_breakdown?.by_passenger_type ?? [])
    .filter((p) => p && p.count > 0)
    .map((p) => `${p.count} ${p.type}${p.count === 1 ? "" : "s"}`);
  if (parts.length) return parts.join(", ");
  const per = quote.per_passenger ?? {};
  const adults = per.adult != null ? 1 : 0;
  return adults ? "1 adult" : "";
}

export function perPassengerStr(quote: FlightQuote, to: CurrencyCode): string {
  const per = quote.per_passenger ?? {};
  const parts = (["adult", "child", "infant"] as const)
    .filter((k) => per[k] != null)
    .map((k) => `${money(per[k], quote.currency, to)}/${k}`);
  return parts.join(" � ");
}

/** Stop airports across a leg, e.g. ['BAH'] for a 1-stop BOM-BAH-JFK routing. */
export function stopAirports(quote: FlightQuote): string[] {
  const out: string[] = [];
  for (const leg of quote.flights ?? []) {
    const segs = leg.segments ?? [];
    for (let i = 0; i < segs.length - 1; i++) {
      const code = segs[i]?.destination_airport;
      if (code) out.push(code);
    }
  }
  return out;
}

export function isFlightQuote(quote: FlightQuote | HotelQuote): quote is FlightQuote {
  return Array.isArray((quote as FlightQuote).flights);
}

export function clockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function dayLabel(epochMs: number): string {
  const d = new Date(epochMs);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
