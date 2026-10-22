import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Info,
  MapPin,
  TriangleAlert,
  Star,
  X,
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
import { AirlineSquare, Badge, Chip, RouteLine } from "./bits";
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
      className="card p-4 transition hover:border-edge2 cursor-pointer hover:bg-card2/50"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <AirlineSquare code={d.code} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold leading-5">{d.airlineNames}</span>
            <Chip>{d.carriers}</Chip>
          </div>
          <div className="mt-1 text-xs text-mut">
            {d.aircraft} • {d.cabin}
          </div>
        </div>
        {d.stops > 0 ? (
          <Badge tone="orange">
            {d.duration} Layover in {d.stopCodes[0] ?? "—"}
          </Badge>
        ) : (
          <Badge tone="green">Non-stop</Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-4">
        <div>
          <div className="font-mono text-xl font-bold">{d.depTime}</div>
          <div className="text-xs text-mut">
            {d.depCode}
            {d.depTerminal && ` · T${d.depTerminal}`}
          </div>
        </div>
        <div>
          <div className="mb-1 text-center font-mono text-[11px] text-mut">
            {d.duration}
            {d.stops > 0 && ` (${d.stops} stop ${d.stopCodes.join(" ")})`}
          </div>
          <RouteLine stops={d.stops} stopCodes={d.stopCodes} />
          <div className="mt-1 text-center text-[11px] text-dim">
            {d.stops === 0 ? "Non-stop" : `Connect via ${d.stopCodes.join(", ")}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl font-bold">
            {d.arrTime}
            {d.dayBadge && <span className="ml-1 font-mono text-[10px] font-bold text-orn">{d.dayBadge}</span>}
          </div>
          <div className="text-xs text-mut">
            {d.arrCode}
            {d.arrTerminal && ` · T${d.arrTerminal}`}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-edge pt-3">
        <span className="text-lg font-bold">{money(quote.total_price, quote.currency, currency)}</span>
        <span className="text-[11px] text-dim">{paxSummary(quote) || "per quote"}</span>
        <div className="flex-1" />
        <button 
          className="btn-primary px-5" 
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
        >
          <BadgeCheck size={15} />
          Book
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
      className="card p-4 transition hover:border-edge2 cursor-pointer hover:bg-card2/50"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <AirlineSquare code={d.code} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold leading-5">{d.airlineNames}</span>
            <Chip>{d.carriers}</Chip>
          </div>
          <div className="mt-1 text-xs text-mut">
            {d.aircraft} • {d.cabin}
          </div>
        </div>
        {isCheapest ? (
          <Badge tone="green">Best Value</Badge>
        ) : d.stops > 0 ? (
          <Badge tone="orange">
            {d.duration} Layover in {d.stopCodes[0] ?? "—"}
          </Badge>
        ) : (
          <Badge tone="green">Non-stop</Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-4">
        <div>
          <div className="font-mono text-xl font-bold">{d.depTime}</div>
          <div className="text-xs text-mut">
            {d.depCode}
            {d.depTerminal && ` · T${d.depTerminal}`}
          </div>
        </div>
        <div>
          <div className="mb-1 text-center font-mono text-[11px] text-mut">
            {d.duration}
            {d.stops > 0 && ` (${d.stops} stop ${d.stopCodes.join(" ")})`}
          </div>
          <RouteLine stops={d.stops} stopCodes={d.stopCodes} />
          <div className="mt-1 text-center text-[11px] text-dim">
            {d.stops === 0 ? "Non-stop" : `Connect via ${d.stopCodes.join(", ")}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl font-bold">
            {d.arrTime}
            {d.dayBadge && <span className="ml-1 font-mono text-[10px] font-bold text-orn">{d.dayBadge}</span>}
          </div>
          <div className="text-xs text-mut">
            {d.arrCode}
            {d.arrTerminal && ` · T${d.arrTerminal}`}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-edge pt-3">
        <span className="text-lg font-bold">{money(quote.total_price, quote.currency, currency)}</span>
        <span className="text-[11px] text-dim">{paxSummary(quote) || "per quote"}</span>
        <div className="flex-1" />
        <button 
          className="btn-primary px-5" 
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
        >
          <BadgeCheck size={15} />
          Book
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

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border border-edge bg-card2/50">
      {/* Stops filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-dim">Stops:</span>
        <select
          value={filters.stops}
          onChange={(e) => onFiltersChange({ stops: e.target.value as FlightFilters["stops"] })}
          className="rounded-lg border border-edge bg-card2 px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-acc/60"
        >
          <option value="all">All ({quotes.length})</option>
          <option value="nonstop">Non-stop ({nonstopCount})</option>
          <option value="1stop">1 Stop ({oneStopCount})</option>
          <option value="2plus">2+ Stops ({twoPlusCount})</option>
        </select>
      </div>

      {/* Time of day filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-dim">Departure:</span>
        <select
          value={filters.timeOfDay}
          onChange={(e) => onFiltersChange({ timeOfDay: e.target.value as FlightFilters["timeOfDay"] })}
          className="rounded-lg border border-edge bg-card2 px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-acc/60"
        >
          <option value="all">All Day</option>
          <option value="morning">Morning (5am–12pm)</option>
          <option value="afternoon">Afternoon (12pm–5pm)</option>
          <option value="evening">Evening (5pm–9pm)</option>
          <option value="night">Night (9pm–5am)</option>
        </select>
      </div>

      {/* Refundable filter */}
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.refundableOnly}
          onChange={(e) => onFiltersChange({ refundableOnly: e.target.checked })}
          className="rounded border-edge bg-card2 text-acc accent-acc focus:ring-acc/50"
        />
        <span className="text-xs text-mut">Refundable only ({refundableCount})</span>
      </label>

      {/* Sort */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-dim">Sort:</span>
        <select
          value={`${filters.sortKey}:${filters.sortDir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":");
            onFiltersChange({ sortKey: key as FlightSortKey, sortDir: dir as SortDirection });
          }}
          className="rounded-lg border border-edge bg-card2 px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-acc/60"
        >
          <option value="price:asc">Price (Low → High)</option>
          <option value="price:desc">Price (High → Low)</option>
          <option value="departure:asc">Departure (Early → Late)</option>
          <option value="departure:desc">Departure (Late → Early)</option>
          <option value="arrival:asc">Arrival (Early → Late)</option>
          <option value="arrival:desc">Arrival (Late → Early)</option>
          <option value="duration:asc">Duration (Short → Long)</option>
          <option value="duration:desc">Duration (Long → Short)</option>
          <option value="stops:asc">Stops (Few → Many)</option>
          <option value="stops:desc">Stops (Many → Few)</option>
        </select>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-dim hover:text-mut rounded border border-edge bg-card2"
        >
          <X size={12} /> Clear filters
        </button>
      )}
    </div>
  );
}

/* ------------------------------ results list ------------------------------ */
export function FlightResults({ quotes }: { quotes: FlightQuote[] }) {
  const { currency } = useStore();
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
          <button className="w-full rounded-lg border border-edge bg-card2/50 py-2 text-xs font-semibold text-mut hover:text-txt" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Collapse list" : `View all ${sorted.length} options`}
          </button>
        )}
       
      </div>

      {sorted.length === 0 && quotes.length > 0 && (
        <div className="text-center py-8 text-mut">
          No flights match your filters. <button className="text-acc underline ml-1" onClick={handleClearAll}>Clear filters</button>
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

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border border-edge bg-card2/50">
      {/* Star rating filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-dim">Rating:</span>
        <select
          value={filters.starRating}
          onChange={(e) => onFiltersChange({ starRating: e.target.value === "all" ? "all" : parseInt(e.target.value) })}
          className="rounded-lg border border-edge bg-card2 px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-acc/60"
        >
          <option value="all">All Stars</option>
          <option value="5">5★+ ({starCounts[5]})</option>
          <option value="4">4★+ ({starCounts[4]})</option>
          <option value="3">3★+ ({starCounts[3]})</option>
        </select>
      </div>

      {/* Price range filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-dim">Max Price:</span>
        <input
          type="number"
          value={filters.maxPrice ?? ""}
          onChange={(e) => onFiltersChange({ maxPrice: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder={maxPrice > 0 ? `Max ${money(maxPrice, quotes[0]?.currency ?? "USD", "USD")}` : "No limit"}
          className="rounded-lg border border-edge bg-card2 w-28 px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-acc/60"
        />
      </div>

      {/* Refundable filter */}
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.refundableOnly}
          onChange={(e) => onFiltersChange({ refundableOnly: e.target.checked })}
          className="rounded border-edge bg-card2 text-acc accent-acc focus:ring-acc/50"
        />
        <span className="text-xs text-mut">Refundable only ({refundableCount})</span>
      </label>

      {/* Sort */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-dim">Sort:</span>
        <select
          value={`${filters.sortKey}:${filters.sortDir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":");
            onFiltersChange({ sortKey: key as HotelSortKey, sortDir: dir as SortDirection });
          }}
          className="rounded-lg border border-edge bg-card2 px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-acc/60"
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
          className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-dim hover:text-mut rounded border border-edge bg-card2"
        >
          <X size={12} /> Clear filters
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
          <div key={(q.quote_id ?? i) as string} className="card p-4 cursor-pointer hover:border-edge2 hover:bg-card2/50 transition">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[15px] font-semibold leading-5">{q.hotel_name || "—"}</div>
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
