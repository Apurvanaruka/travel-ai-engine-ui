/**
 * UI-side defaults & fallbacks  •  clearly separated from API-driven data.
 * These are frontend-only constants used when no backend equivalent exists.
 * They are NOT synthetic/mock data; they are sensible UI defaults.
 */

import type { CurrencyCode } from "../types";
import { PlaneTakeoff, Building2, Globe2, RefreshCcw } from "lucide-react";

/* ------------------------------ currency --------------------------------- */
export const DEFAULT_CURRENCY: CurrencyCode = "USD";

/** Indicative corporate desk rates (1 USD base). Display-only fallbacks when no live rate API exists. */
export const INDICATIVE_FX_FROM_USD: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 83.4,
  EUR: 0.92,
};

/* --------------------------- meal preferences ---------------------------- */
export const DEFAULT_MEAL_OPTIONS = [
  "Standard Business Gourmet",
  "Vegetarian (Asian)",
  "Hindu Non-Veg / Special meal",
  "Low Sodium / Medical",
  "Vegan",
  "Gluten-Free",
  "Kosher",
  "Halal",
] as const;

/* ------------------------------ seat map --------------------------------- */
export const DEFAULT_SEAT_POOL = [
  "1A (Window)",
  "1B (Aisle)",
  "1C (Aisle)",
  "1D (Window)",
  "2A (Window)",
  "2B (Aisle)",
  "2C (Aisle)",
  "2D (Window)",
  "3A (Window)",
  "3B (Aisle)",
  "3C (Aisle)",
  "3D (Window)",
  "4A (Window)",
  "4B (Aisle)",
  "4C (Aisle)",
  "4D (Window)",
  "5A (Window)",
  "5B (Aisle)",
  "5C (Aisle)",
  "5D (Window)",
] as const;

/* -------------------------- payment methods ------------------------------ */
export interface PaymentMethodDefault {
  id: "amex" | "costcenter" | "invoice";
  icon: "CreditCard" | "Landmark" | "FileText";
  title: string;
  description: string;
  details: string;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodDefault[] = [
  {
    id: "amex",
    icon: "CreditCard",
    title: "Amex Corporate Token",
    description: "Single-use virtual card protection",
    details: " •  •  •  •   •  •  •  •   •  •  •  •  8912",
  },
  {
    id: "costcenter",
    icon: "Landmark",
    title: "Bill to Cost Center Direct",
    description: "Automatic draw from Executive Travel Reserve",
    details: "Clears via Department Head Code",
  },
  {
    id: "invoice",
    icon: "FileText",
    title: "Corporate Monthly Invoice",
    description: "Consolidated Net-30 enterprise settlement",
    details: "Requires Accounts Payable approval",
  },
] as const;

/* -------------------------- airline colors ------------------------------- */
export const AIRLINE_COLORS: Record<string, string> = {
  AI: "#60a5fa",
  EK: "#f87171",
  QR: "#93a3f8",
  GF: "#fbbf24",
  BA: "#7dd3fc",
  LH: "#fde047",
  SQ: "#fcd34d",
  UA: "#93c5fd",
  EY: "#f472b6",
  TK: "#f87171",
};
export const AIRLINE_COLOR_FALLBACKS = [
  "#60a5fa",
  "#f87171",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#22d3ee",
  "#f472b6",
] as const;

/* ---------------------------- workflows ---------------------------------- */
export const WORKFLOWS = [
  {
    icon: PlaneTakeoff,
    title: "Mumbai → New York Non-stop",
    badge: "Pre-Approved",
    tone: "green" as const,
    desc: "Book direct business class flight for 2 via Air India / United.",
    stats: ["2 travelers", "Non-stop preferred"],
    prompt: "Book me a flight from Mumbai to New York for 2 adults in business class",
  },
  {
    icon: Building2,
    title: "London Financial Roadshow",
    badge: "Package",
    tone: "blue" as const,
    desc: "Book flights + 4 nights near Canary Wharf with corporate boardroom access.",
    stats: ["4 nights", "2 adults"],
    prompt: "Find 5-star hotels near Canary Wharf London for 4 nights, 2 adults, corporate rate",
  },
  {
    icon: Globe2,
    title: "Tokyo Executive Summit",
    badge: "ANA / SQ",
    tone: "slate" as const,
    desc: "Flight with Star Alliance lounge access & private airport transfer to Roppongi.",
    stats: ["Round trip", "Lounge access"],
    prompt: "Business class flights to Tokyo on 12 Nov returning 18 Nov, with lounge access",
  },
  {
    icon: RefreshCcw,
    title: "Modify Itinerary & Policy Check",
    badge: "Allowance",
    tone: "orange" as const,
    desc: "Check corporate travel headroom & rebook return flight without penalty.",
    stats: ["Policy check", "Allowance review"],
    prompt: "Check my corporate travel allowance headroom for this quarter",
  },
] as const;
