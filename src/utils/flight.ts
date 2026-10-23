/**
 * Flight-quote display helpers.
 *
 * These are pure data transformations (quote payload → view model), which is
 * why they live in `utils` rather than next to the React components.
 */
import type { FlightQuote } from "../types";
import { carrierLabel, dayOffset, durationStr, stopAirports, timeOf, titleCase } from "./format";

export interface FlightDisplay {
  code: string;
  airlineNames: string;
  carriers: string;
  aircraft: string;
  cabin: string;
  depTime: string;
  arrTime: string;
  depCode: string;
  arrCode: string;
  depName: string;
  arrName: string;
  depTerminal: string | null;
  arrTerminal: string | null;
  duration: string;
  stops: number;
  stopCodes: string[];
  bagPieces: number | null;
  bagKg: number | null;
  refundable: boolean;
  dayBadge: string | null;
  departureHour: number | null;
  arrivalHour: number | null;
}

export function displayOf(quote: FlightQuote): FlightDisplay {
  const leg = (quote.flights ?? [])[0];
  const segments = leg?.segments ?? [];
  const first = segments[0] ?? {};
  const last = segments[segments.length - 1] ?? {};
  const names = [
    ...new Set(segments.map((segment) => segment.airline?.name).filter(Boolean)),
  ] as string[];
  const carriers = segments
    .map((segment) => carrierLabel(segment.airline?.code, segment.flight_number))
    .filter(Boolean)
    .join(" / ");
  const aircraft = [...new Set(segments.map((segment) => segment.aircraft).filter(Boolean))].join(
    " + ",
  );
  const stops = leg?.stops ?? Math.max(0, segments.length - 1);
  const bag = (quote.baggage ?? [])[0];

  const departureHour = leg?.departure_at ? new Date(leg.departure_at).getHours() : null;
  const arrivalHour = leg?.arrival_at ? new Date(leg.arrival_at).getHours() : null;

  return {
    code: first.airline?.code ?? "—",
    airlineNames: names.join(" / ") || first.airline?.code || "—",
    carriers: carriers || "—",
    aircraft: aircraft || "—",
    cabin: titleCase(quote.cabin_class ?? "—"),
    depTime: timeOf(leg?.departure_at) ?? "—",
    arrTime: timeOf(leg?.arrival_at) ?? "—",
    depCode: leg?.origin?.code ?? "?",
    arrCode: leg?.destination?.code ?? "?",
    depName: leg?.origin?.name ?? "",
    arrName: leg?.destination?.name ?? "",
    depTerminal: first.terminal_departure ?? null,
    arrTerminal: last.terminal_arrival ?? null,
    duration: durationStr(leg?.duration_minutes),
    stops,
    stopCodes: stopAirports(quote),
    bagPieces: bag?.pieces ?? null,
    bagKg: bag?.checkin_kg ?? null,
    refundable: Boolean(quote.refundable),
    dayBadge: dayOffset(leg?.departure_at, leg?.arrival_at),
    departureHour,
    arrivalHour,
  };
}
