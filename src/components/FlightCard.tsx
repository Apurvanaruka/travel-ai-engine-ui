import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Info,
  MapPin,
  TriangleAlert,
  Star,
  X,
  Plane,
} from "lucide-react";
import type { FlightQuote, HotelQuote, TaskReply } from "../lib/types";
import {
  carrierLabel,
  dayOffset,
  durationStr,
  money,
  paxSummary,
  stopAirports,
  timeOf,
  titleCase,
  type CurrencyCode,
} from "../lib/format";
import { AirlineSquare, Badge, Chip } from "./bits";
import { useStore } from "../state/store";

/* ------------------------- quote → display model ------------------------- */
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
  const segs = leg?.segments ?? [];
  const first = segs[0] ?? {};
  const last = segs[segs.length - 1] ?? {};
  const names = [...new Set(segs.map((s) => s.airline?.name).filter(Boolean))] as string[];
  const carriers = segs
    .map((s) => carrierLabel(s.airline?.code, s.flight_number))
    .filter(Boolean)
    .join(" / ");
  const aircraft = [...new Set(segs.map((s) => s.aircraft).filter(Boolean))].join(" + ");
  const stops = leg?.stops ?? Math.max(0, segs.length - 1);
  const bag = (quote.baggage ?? [])[0];

  // Parse departure/arrival hours for time-of-day filtering
  const depHour = leg?.departure_at ? new Date(leg.departure_at).getHours() : null;
  const arrHour = leg?.arrival_at ? new Date(leg.arrival_at).getHours() : null;

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
    refundable: !!quote.refundable,
    dayBadge: dayOffset(leg?.departure_at, leg?.arrival_at),
    departureHour: depHour,
    arrivalHour: arrHour,
  };
}

/* --------------------------- filter/sort types --------------------------- */
type FlightSortKey = "price" | "departure" | "arrival" | "duration" | "stops";
type SortDirection = "asc" | "desc";

interface FlightFilters {
  stops: "all" | "nonstop" | "1stop" | "2plus";
  timeOfDay: "all" | "morning" | "afternoon" | "evening" | "night";
  refundableOnly: boolean;
  sortKey: FlightSortKey;
  sortDir: SortDirection;
}

const DEFAULT_FILTERS: FlightFilters = {
  stops: "all",
  timeOfDay: "all",
  refundableOnly: false,
  sortKey: "price",
  sortDir: "asc",
};

function matchesTimeOfDay(hour: number | null, filter: FlightFilters["timeOfDay"]): boolean {
  if (filter === "all" || hour === null) return true;
  if (filter === "morning") return hour >= 5 && hour < 12;
  if (filter === "afternoon") return hour >= 12 && hour < 17;
  if (filter === "evening") return hour >= 17 && hour < 21;
  if (filter === "night") return hour >= 21 || hour < 5;
  return true;
}

function sortFlights(quotes: FlightQuote[], key: FlightSortKey, dir: SortDirection): FlightQuote[] {
  return [...quotes].sort((a, b) => {
    const da = displayOf(a);
    const db = displayOf(b);
    let cmp = 0;
    switch (key) {
      case "price":
        cmp = (a.total_price ?? Infinity) - (b.total_price ?? Infinity);
        break;
      case "departure":
        cmp = (da.departureHour ?? 99) - (db.departureHour ?? 99);
        break;
      case "arrival":
        cmp = (da.arrivalHour ?? 99) - (db.arrivalHour ?? 99);
        break;
      case "duration": {
        const legA = (a.flights ?? [])[0];
        const legB = (b.flights ?? [])[0];
        cmp = (legA?.duration_minutes ?? Infinity) - (legB?.duration_minutes ?? Infinity);
        break;
      }
      case "stops":
        cmp = da.stops - db.stops;
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function filterFlights(quotes: FlightQuote[], filters: FlightFilters): FlightQuote[] {
  return quotes.filter((q) => {
    const d = displayOf(q);
    // Stops filter
    if (filters.stops === "nonstop" && d.stops !== 0) return false;
    if (filters.stops === "1stop" && d.stops !== 1) return false;
    if (filters.stops === "2plus" && d.stops < 2) return false;
    // Time of day filter (based on departure)
    if (!matchesTimeOfDay(d.departureHour, filters.timeOfDay)) return false;
    // Refundable filter
    if (filters.refundableOnly && !d.refundable) return false;
    return true;
  });
}

/* ------------------------------ featured card ----------------------------- */
function FeaturedFlightCard({ quote, onSelect }: { quote: FlightQuote; onSelect: () => void }) {
  const { currency, openCheckout } = useStore();
  const d = displayOf(quote);

  const handleClick = () => {
    onSelect();
    openCheckout(quote);
  };

  return (
    <div 
      className="flight-card p-5 transition cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Airline info */}
        <div className="flex items-center gap-3">
          <AirlineSquare code={d.code} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold leading-5 text-txt">{d.airlineNames}</span>
              <Chip>{d.carriers}</Chip>
            </div>
            <div className="mt-1 text-xs text-mut">
              {d.aircraft} • {d.cabin}
            </div>
          </div>
        </div>
        
        {/* Layover/Non-stop badge at top-right */}
        <div className="flex-1" />
        {d.stops > 0 ? (
          <span className="badge-orn shrink-0">
            {d.duration} · {d.stops} stop{d.stops > 1 ? "s" : ""} via {d.stopCodes[0] ?? "—"}
          </span>
        ) : (
          <span className="badge-grn shrink-0">Non-stop</span>
        )}
      </div>

      {/* Flight timeline */}
      <div className="mt-5 relative">
        <div className="flex items-center gap-4 relative">
          {/* Departure */}
          <div className="flex-1 min-w-0 text-left">
            <div className="font-mono text-2xl font-bold text-txt">{d.depTime}</div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-mut">
              <MapPin size={12} className="text-dim" />
              <span className="font-medium text-txt">{d.depCode}</span>
              {d.depTerminal && <span className="text-dim">· T{d.depTerminal}</span>}
              {d.depName && <span className="hidden md:inline text-dim">· {d.depName}</span>}
            </div>
          </div>

          {/* Timeline with plane and stops */}
          <div className="flex-1 relative min-w-0">
            <div className="relative h-8">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded bg-edge2" />
              <div className="absolute left-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acc2" />
              <div className="absolute right-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acc2" />
              
              {/* Stop dots */}
              {d.stopCodes.length > 0 && d.stopCodes.map((code, i) => (
                <div
                  key={code}
                  title={code}
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orn"
                  style={{ left: `${((i + 1) / (d.stopCodes.length + 1)) * 100}%` }}
                />
              ))}
              
              {/* Plane icon in center */}
              <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card px-1.5 border border-edge">
                <Plane size={14} className="text-acc2" style={{ transform: "rotate(45deg)" }} />
              </div>
            </div>
            
            {/* Duration and stops info */}
            <div className="mt-2 text-center text-xs text-mut">
              {d.duration}
              {d.stops > 0 && ` · ${d.stops} stop${d.stops > 1 ? "s" : ""}`}
            </div>
            <div className="mt-1 text-center text-xs text-dim">
              {d.stops === 0 ? "Non-stop" : `Connect via ${d.stopCodes.join(", ")}`}
            </div>
          </div>

          {/* Arrival */}
          <div className="flex-1 min-w-0 text-right">
            <div className="font-mono text-2xl font-bold text-txt">
              {d.arrTime}
              {d.dayBadge && <span className="ml-1.5 font-mono text-xs font-bold text-orn">{d.dayBadge}</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1 justify-end text-sm text-mut">
              {d.arrTerminal && <span className="text-dim">T{d.arrTerminal} ·</span>}
              <span className="font-medium text-txt">{d.arrCode}</span>
              <MapPin size={12} className="text-dim" />
              {d.arrName && <span className="hidden md:inline text-dim">· {d.arrName}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Price and book section */}
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-edge pt-4">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-txt tabular-nums">{money(quote.total_price, quote.currency, currency)}</span>
          <span className="text-[11px] text-dim">{paxSummary(quote) || "per quote"}</span>
          {d.bagPieces != null && (
            <span className="flex items-center gap-1 text-[11px] text-mut border-l border-edge pl-3">
              <span>{d.bagPieces}× {d.bagKg ?? "—"}kg</span>
            </span>
          )}
          {d.refundable && (
            <span className="flex items-center gap-1 text-[11px] text-grn border-l border-edge pl-3">
              <Badge tone="green">Refundable</Badge>
            </span>
          )}
        </div>
        <button 
          className="btn-primary px-6 py-2.5 flex items-center gap-2 shrink-0" 
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
        >
          <BadgeCheck size={16} />
          <span className="font-semibold">Book</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ standard card ----------------------------- */
function StandardFlightCard({
  quote,
  isCheapest,
  onSelect,
}: {
  quote: FlightQuote;
  isCheapest: boolean;
  onSelect: () => void;
}) {
  const { currency, openCheckout } = useStore();
  const d = displayOf(quote);

  const handleClick = () => {
    onSelect();
    openCheckout(quote);
  };

  return (
    <div 
      className="flight-card p-5 transition cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Airline info */}
        <div className="flex items-center gap-3">
          <AirlineSquare code={d.code} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold leading-5 text-txt">{d.airlineNames}</span>
              <Chip>{d.carriers}</Chip>
            </div>
            <div className="mt-1 text-xs text-mut">
              {d.aircraft} • {d.cabin}
            </div>
          </div>
        </div>
        
        {/* Badge at top-right */}
        <div className="flex-1" />
        {isCheapest ? (
          <Badge tone="green" className="shrink-0">Best Value</Badge>
        ) : d.stops > 0 ? (
          <span className="badge-orn shrink-0">
            {d.duration} · {d.stops} stop{d.stops > 1 ? "s" : ""} via {d.stopCodes[0] ?? "—"}
          </span>
        ) : (
          <span className="badge-grn shrink-0">Non-stop</span>
        )}
      </div>

      {/* Flight timeline */}
      <div className="mt-5 relative">
        <div className="flex items-center gap-4 relative">
          {/* Departure */}
          <div className="flex-1 min-w-0 text-left">
            <div className="font-mono text-2xl font-bold text-txt">{d.depTime}</div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-mut">
              <MapPin size={12} className="text-dim" />
              <span className="font-medium text-txt">{d.depCode}</span>
              {d.depTerminal && <span className="text-dim">· T{d.depTerminal}</span>}
              {d.depName && <span className="hidden md:inline text-dim">· {d.depName}</span>}
            </div>
          </div>

          {/* Timeline with plane and stops */}
          <div className="flex-1 relative min-w-0">
            <div className="relative h-8">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded bg-edge2" />
              <div className="absolute left-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acc2" />
              <div className="absolute right-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acc2" />
              
              {/* Stop dots */}
              {d.stopCodes.length > 0 && d.stopCodes.map((code, i) => (
                <div
                  key={code}
                  title={code}
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orn"
                  style={{ left: `${((i + 1) / (d.stopCodes.length + 1)) * 100}%` }}
                />
              ))}
              
              {/* Plane icon in center */}
              <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card px-1.5 border border-edge">
                <Plane size={14} className="text-mut" style={{ transform: "rotate(45deg)" }} />
              </div>
            </div>
            
            {/* Duration and stops info */}
            <div className="mt-2 text-center text-xs text-mut">
              {d.duration}
              {d.stops > 0 && ` · ${d.stops} stop${d.stops > 1 ? "s" : ""}`}
            </div>
            <div className="mt-1 text-center text-xs text-dim">
              {d.stops === 0 ? "Non-stop" : `Connect via ${d.stopCodes.join(", ")}`}
            </div>
          </div>

          {/* Arrival */}
          <div className="flex-1 min-w-0 text-right">
            <div className="font-mono text-2xl font-bold text-txt">
              {d.arrTime}
              {d.dayBadge && <span className="ml-1.5 font-mono text-xs font-bold text-orn">{d.dayBadge}</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1 justify-end text-sm text-mut">
              {d.arrTerminal && <span className="text-dim">T{d.arrTerminal} ·</span>}
              <span className="font-medium text-txt">{d.arrCode}</span>
              <MapPin size={12} className="text-dim" />
              {d.arrName && <span className="hidden md:inline text-dim">· {d.arrName}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Price and book section */}
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-edge pt-4">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-txt tabular-nums">{money(quote.total_price, quote.currency, currency)}</span>
          <span className="text-[11px] text-dim">{paxSummary(quote) || "per quote"}</span>
          {d.bagPieces != null && (
            <span className="flex items-center gap-1 text-[11px] text-mut border-l border-edge pl-3">
              <span>{d.bagPieces}× {d.bagKg ?? "—"}kg</span>
            </span>
          )}
          {d.refundable && (
            <span className="flex items-center gap-1 text-[11px] text-grn border-l border-edge pl-3">
              <Badge tone="green">Refundable</Badge>
            </span>
          )}
        </div>
        <button 
          className="btn-primary px-6 py-2.5 flex items-center gap-2 shrink-0" 
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
        >
          <BadgeCheck size={16} />
          <span className="font-semibold">Book</span>
        </button>
      </div>
    </div>
  );
}

/* ---------------------------- filter/sort bar ----------------------------- */
function FlightFilterBar({ 
  filters, 
  onFiltersChange,
  quotes,
  onClearAll 
}: { 
  filters: FlightFilters; 
  onFiltersChange: (f: Partial<FlightFilters>) => void;
  quotes: FlightQuote[];
  onClearAll: () => void;
}) {
  const nonstopCount = quotes.filter(q => displayOf(q).stops === 0).length;
  const oneStopCount = quotes.filter(q => displayOf(q).stops === 1).length;
  const twoPlusCount = quotes.filter(q => displayOf(q).stops >= 2).length;
  const refundableCount = quotes.filter(q => displayOf(q).refundable).length;

  const hasActiveFilters = 
    filters.stops !== "all" || 
    filters.timeOfDay !== "all" || 
    filters.refundableOnly;

  // Dropdown component for consistent styling
  function FilterSelect({ label, value, options, onChange, className = "" }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    className?: string;
  }) {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor={label} className="text-xs font-medium text-dim hidden sm:block">{label}</label>
        <select
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`filter-control text-sm font-medium ${className}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  const stopsOptions = [
    { value: "all", label: `All (${quotes.length})` },
    { value: "nonstop", label: `Non-stop (${nonstopCount})` },
    { value: "1stop", label: `1 Stop (${oneStopCount})` },
    { value: "2plus", label: `2+ Stops (${twoPlusCount})` },
  ];

  const timeOptions = [
    { value: "all", label: "All Day" },
    { value: "morning", label: "Morning (5am–12pm)" },
    { value: "afternoon", label: "Afternoon (12pm–5pm)" },
    { value: "evening", label: "Evening (5pm–9pm)" },
    { value: "night", label: "Night (9pm–5am)" },
  ];

  const sortOptions = [
    { value: "price:asc", label: "Price (Low → High)" },
    { value: "price:desc", label: "Price (High → Low)" },
    { value: "departure:asc", label: "Departure (Early → Late)" },
    { value: "departure:desc", label: "Departure (Late → Early)" },
    { value: "arrival:asc", label: "Arrival (Early → Late)" },
    { value: "arrival:desc", label: "Arrival (Late → Early)" },
    { value: "duration:asc", label: "Duration (Short → Long)" },
    { value: "duration:desc", label: "Duration (Long → Short)" },
    { value: "stops:asc", label: "Stops (Few → Many)" },
    { value: "stops:desc", label: "Stops (Many → Few)" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-edge bg-card/50">
      {/* Stops filter */}
      <FilterSelect
        label="Stops"
        value={filters.stops}
        options={stopsOptions}
        onChange={(v) => onFiltersChange({ stops: v as FlightFilters["stops"] })}
      />

      {/* Time of day filter */}
      <FilterSelect
        label="Departure"
        value={filters.timeOfDay}
        options={timeOptions}
        onChange={(v) => onFiltersChange({ timeOfDay: v as FlightFilters["timeOfDay"] })}
      />

      {/* Refundable filter */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.refundableOnly}
          onChange={(e) => onFiltersChange({ refundableOnly: e.target.checked })}
          className="rounded border-edge bg-card2 text-acc accent-acc focus:ring-acc/50 size-4"
        />
        <span className="text-sm text-mut hidden sm:inline">Refundable only ({refundableCount})</span>
        <span className="text-sm text-mut sm:hidden">Refundable ({refundableCount})</span>
      </label>

      {/* Sort */}
      <div className="flex items-center gap-2 ml-auto">
        <label htmlFor="sort" className="text-xs font-medium text-dim hidden sm:block">Sort</label>
        <select
          id="sort"
          value={`${filters.sortKey}:${filters.sortDir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":");
            onFiltersChange({ sortKey: key as FlightSortKey, sortDir: dir as SortDirection });
          }}
          className="filter-control text-sm font-medium"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-dim hover:text-mut rounded-lg border border-edge bg-card2 hover:bg-card transition"
        >
          <X size={13} /> Clear filters
        </button>
      )}
    </div>
  );
}

/* ------------------------------ results list ------------------------------ */
export function FlightResults({ quotes }: { quotes: FlightQuote[] }) {
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState<FlightFilters>(DEFAULT_FILTERS);

  if (!quotes.length) return null;

  const filtered = useMemo(() => filterFlights(quotes, filters), [quotes, filters]);
  const sorted = useMemo(() => sortFlights(filtered, filters.sortKey, filters.sortDir), [filtered, filters.sortKey, filters.sortDir]);
  const prices = sorted.map((q) => q.total_price ?? Infinity);
  const cheapest = sorted[prices.indexOf(Math.min(...prices))];
  const visible = showAll ? sorted : sorted.slice(0, 4);

  const handleClearAll = () => setFilters(DEFAULT_FILTERS);
  const handleFilterChange = (partial: Partial<FlightFilters>) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  return (
    <div className="space-y-4">
      {/* Filter/Sort Bar */}
      <FlightFilterBar 
        filters={filters} 
        onFiltersChange={handleFilterChange}
        quotes={quotes}
        onClearAll={handleClearAll}
      />

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-mut mb-2">
        <span>Showing {visible.length} of {sorted.length} option{sorted.length !== 1 ? "s" : ""}</span>
        {filters.stops !== "all" && (
          <span className="text-acc font-medium">
            Filtered: {filters.stops === "nonstop" ? "Non-stop" : filters.stops === "1stop" ? "1 Stop" : "2+ Stops"}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {sorted.length > 0 && (
          <FeaturedFlightCard 
            quote={sorted[0]} 
            onSelect={() => {}} 
          />
        )}
        {visible.slice(1).map((q, i) => (
          <StandardFlightCard 
            key={(q.quote_id ?? i) as string} 
            quote={q} 
            isCheapest={q === cheapest}
            onSelect={() => {}}
          />
        ))}
        {sorted.length > 4 && (
          <button 
            className="w-full rounded-xl border border-edge bg-card/50 py-3 text-sm font-semibold text-mut hover:text-txt hover:border-edge2 transition"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Collapse list" : `View all ${sorted.length} options`}
          </button>
        )}
       
      </div>

      {sorted.length === 0 && quotes.length > 0 && (
        <div className="text-center py-10 text-mut">
          <div className="text-txt font-medium mb-1">No flights match your filters</div>
          <button className="text-acc underline ml-1" onClick={handleClearAll}>Clear filters</button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- hotels --------------------------------- */
/* Hotel filter types */
type HotelSortKey = "price" | "rating" | "distance" | "perNight";
interface HotelFilters {
  starRating: number | "all"; // 3, 4, 5 or "all"
  maxPrice: number | null;
  refundableOnly: boolean;
  sortKey: HotelSortKey;
  sortDir: SortDirection;
}

const DEFAULT_HOTEL_FILTERS: HotelFilters = {
  starRating: "all",
  maxPrice: null,
  refundableOnly: false,
  sortKey: "price",
  sortDir: "asc",
};

function sortHotels(quotes: HotelQuote[], key: HotelSortKey, dir: SortDirection): HotelQuote[] {
  return [...quotes].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "price":
        cmp = (a.total_price ?? Infinity) - (b.total_price ?? Infinity);
        break;
      case "rating":
        cmp = (b.star_rating ?? 0) - (a.star_rating ?? 0);
        break;
      case "distance":
        cmp = (a.distance_to_landmark_km ?? Infinity) - (b.distance_to_landmark_km ?? Infinity);
        break;
      case "perNight":
        cmp = (a.per_room_per_night ?? Infinity) - (b.per_room_per_night ?? Infinity);
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function filterHotels(quotes: HotelQuote[], filters: HotelFilters): HotelQuote[] {
  return quotes.filter((q) => {
    if (filters.starRating !== "all" && (q.star_rating ?? 0) < filters.starRating) return false;
    if (filters.maxPrice !== null && (q.total_price ?? Infinity) > filters.maxPrice) return false;
    if (filters.refundableOnly && !q.refundable) return false;
    return true;
  });
}

function HotelFilterBar({ 
  filters, 
  onFiltersChange,
  quotes,
  onClearAll 
}: { 
  filters: HotelFilters; 
  onFiltersChange: (f: Partial<HotelFilters>) => void;
  quotes: HotelQuote[];
  onClearAll: () => void;
}) {
  const starCounts = {
    5: quotes.filter(q => (q.star_rating ?? 0) >= 5).length,
    4: quotes.filter(q => (q.star_rating ?? 0) >= 4).length,
    3: quotes.filter(q => (q.star_rating ?? 0) >= 3).length,
  };
  const refundableCount = quotes.filter(q => q.refundable).length;
  const maxPrice = Math.max(...quotes.map(q => q.total_price ?? 0));
  
  const hasActiveFilters = 
    filters.starRating !== "all" || 
    filters.maxPrice !== null || 
    filters.refundableOnly;

  function FilterSelect({ label, value, options, onChange, className = "" }: {
    label: string;
    value: string | number;
    options: { value: string | number; label: string }[];
    onChange: (value: string | number) => void;
    className?: string;
  }) {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor={label} className="text-xs font-medium text-dim hidden sm:block">{label}</label>
        <select
          id={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`filter-control text-sm font-medium ${className}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-edge bg-card/50">
      {/* Star rating filter */}
      <FilterSelect
        label="Rating"
        value={filters.starRating}
        options={[
          { value: "all", label: "All Stars" },
          { value: 5, label: `5★+ (${starCounts[5]})` },
          { value: 4, label: `4★+ (${starCounts[4]})` },
          { value: 3, label: `3★+ (${starCounts[3]})` },
        ]}
        onChange={(v) => onFiltersChange({ starRating: v === "all" ? "all" : parseInt(v as string) })}
      />

      {/* Price range filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="maxPrice" className="text-xs font-medium text-dim hidden sm:block">Max Price</label>
        <input
          id="maxPrice"
          type="number"
          value={filters.maxPrice ?? ""}
          onChange={(e) => onFiltersChange({ maxPrice: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder={maxPrice > 0 ? `Max ${money(maxPrice, quotes[0]?.currency ?? "USD", "USD")}` : "No limit"}
          className="filter-control w-32 text-sm font-mono"
        />
      </div>

      {/* Refundable filter */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.refundableOnly}
          onChange={(e) => onFiltersChange({ refundableOnly: e.target.checked })}
          className="rounded border-edge bg-card2 text-acc accent-acc focus:ring-acc/50 size-4"
        />
        <span className="text-sm text-mut">Refundable only ({refundableCount})</span>
      </label>

      {/* Sort */}
      <div className="flex items-center gap-2 ml-auto">
        <label htmlFor="hotelSort" className="text-xs font-medium text-dim hidden sm:block">Sort</label>
        <select
          id="hotelSort"
          value={`${filters.sortKey}:${filters.sortDir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":");
            onFiltersChange({ sortKey: key as HotelSortKey, sortDir: dir as SortDirection });
          }}
          className="filter-control text-sm font-medium"
        >
          <option value="price:asc">Total Price (Low → High)</option>
          <option value="price:desc">Total Price (High → Low)</option>
          <option value="perNight:asc">Per Night (Low → High)</option>
          <option value="perNight:desc">Per Night (High → Low)</option>
          <option value="rating:desc">Rating (High → Low)</option>
          <option value="distance:asc">Distance to Landmark (Near → Far)</option>
        </select>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-dim hover:text-mut rounded-lg border border-edge bg-card2 hover:bg-card transition"
        >
          <X size={13} /> Clear filters
        </button>
      )}
    </div>
  );
}

/* --------------------------------- hotels --------------------------------- */
export function HotelResults({ result }: { result: TaskReply }) {
  const { currency } = useStore();
  const quotes = (result.quotes ?? []) as HotelQuote[];
  if (!quotes.length) return null;
  const priceFilter = (result.price_filter ?? (result.output as Record<string, unknown> | null)?.price_filter ?? null) as
    | { matched?: number | null; note?: string | null }
    | null;
  const first = quotes[0];
  const landmark = first?.landmark_name;

  const [filters, setFilters] = useState<HotelFilters>(DEFAULT_HOTEL_FILTERS);

  const filtered = useMemo(() => filterHotels(quotes, filters), [quotes, filters]);
  const sorted = useMemo(() => sortHotels(filtered, filters.sortKey, filters.sortDir), [filtered, filters.sortKey, filters.sortDir]);

  const handleClearAll = () => setFilters(DEFAULT_HOTEL_FILTERS);
  const handleFilterChange = (partial: Partial<HotelFilters>) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  return (
    <div className="space-y-3">
      {priceFilter && priceFilter.matched === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-orn/40 bg-orn/10 px-3 py-2 text-xs text-orn">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          {priceFilter.note || "No hotel met your price cap; showing the closest available options."}
        </div>
      )}
      {landmark && first?.distance_to_landmark_km != null && (
        <div className="flex items-center gap-2 rounded-lg border border-acc/40 bg-acc/10 px-3 py-2 text-xs text-acc2">
          <MapPin size={14} />
          Hotels ranked by proximity to <strong>{landmark}</strong>
        </div>
      )}

      {/* Hotel Filter Bar */}
      <HotelFilterBar 
        filters={filters} 
        onFiltersChange={handleFilterChange}
        quotes={quotes}
        onClearAll={handleClearAll}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((q, i) => (
          <div key={(q.quote_id ?? i) as string} className="flight-card p-4 cursor-pointer transition">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-base font-semibold leading-5">{q.hotel_name || "—"}</div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-orn">
                  {Array.from({ length: q.star_rating ?? 0 }).map((_, s) => (
                    <Star key={s} size={11} fill="currentColor" />
                  ))}
                  <span className="ml-1 text-dim">{q.city}</span>
                </div>
              </div>
              <Badge tone={q.refundable ? "green" : "slate"}>{q.refundable ? "Refundable" : "Prepaid"}</Badge>
            </div>
            <div className="mt-3 space-y-1 text-[12px] text-mut">
              <div className="flex justify-between"><span className="text-dim">Area</span><span>{q.location || "—"}</span></div>
              {q.distance_to_landmark_km != null && (
                <div className="flex justify-between">
                  <span className="text-dim">Distance</span>
                  <span>{q.distance_to_landmark_km.toFixed(1)} km {q.landmark_name ? `from ${q.landmark_name}` : ""}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-dim">Room</span><span>{q.room_type || "—"}</span></div>
              <div className="flex justify-between"><span className="text-dim">Meal plan</span><span>{q.board_basis || "—"}</span></div>
              <div className="flex justify-between"><span className="text-dim">Per night</span><span className="font-mono">{money(q.per_room_per_night, q.currency, currency)}</span></div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-edge pt-3">
              <span className="text-lg font-bold">{money(q.total_price, q.currency, currency)}</span>
              <span className="flex items-center gap-1 text-[11px] text-dim"><Info size={11} /> total stay</span>
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && quotes.length > 0 && (
        <div className="text-center py-8 text-mut">
          No hotels match your filters. <button className="text-acc underline ml-1" onClick={handleClearAll}>Clear filters</button>
        </div>
      )}
    </div>
  );
}

export type { CurrencyCode };