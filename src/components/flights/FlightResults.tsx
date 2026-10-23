import { useMemo, useState } from "react";
import { BadgeCheck, Hotel, Info, MapPin, Plane, Star, TriangleAlert, X } from "lucide-react";
import type { FlightQuote, HotelQuote, TaskReply } from "../../types";
import { money, paxSummary } from "../../utils/format";
import { displayOf, type FlightDisplay } from "../../utils/flight";
import { AirlineSquare, Alert, Badge, Button, Chip, Input, SelectField } from "../common";
import { useStore } from "../../hooks/useStore";

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

function sortFlights(
  quotes: FlightQuote[],
  key: FlightSortKey,
  direction: SortDirection,
): FlightQuote[] {
  return [...quotes].sort((a, b) => {
    const da = displayOf(a);
    const db = displayOf(b);
    let comparison = 0;

    switch (key) {
      case "price":
        comparison = (a.total_price ?? Infinity) - (b.total_price ?? Infinity);
        break;
      case "departure":
        comparison = (da.departureHour ?? 99) - (db.departureHour ?? 99);
        break;
      case "arrival":
        comparison = (da.arrivalHour ?? 99) - (db.arrivalHour ?? 99);
        break;
      case "duration": {
        const legA = (a.flights ?? [])[0];
        const legB = (b.flights ?? [])[0];
        comparison = (legA?.duration_minutes ?? Infinity) - (legB?.duration_minutes ?? Infinity);
        break;
      }
      case "stops":
        comparison = da.stops - db.stops;
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });
}

function filterFlights(quotes: FlightQuote[], filters: FlightFilters): FlightQuote[] {
  return quotes.filter((quote) => {
    const display = displayOf(quote);
    if (filters.stops === "nonstop" && display.stops !== 0) return false;
    if (filters.stops === "1stop" && display.stops !== 1) return false;
    if (filters.stops === "2plus" && display.stops < 2) return false;
    if (!matchesTimeOfDay(display.departureHour, filters.timeOfDay)) return false;
    if (filters.refundableOnly && !display.refundable) return false;
    return true;
  });
}

/* ------------------------------ route line ------------------------------- */
function FlightRoute({ flight, featured }: { flight: FlightDisplay; featured: boolean }) {
  return (
    <div className="relative mt-5">
      <div className="relative flex items-center gap-4">
        <div className="min-w-0 flex-1 text-left">
          <div className="font-mono text-2xl font-bold text-txt">{flight.depTime}</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-mut">
            <MapPin size={12} className="text-dim" />
            <span className="font-medium text-txt">{flight.depCode}</span>
            {flight.depTerminal && <span className="text-dim">· T{flight.depTerminal}</span>}
            {flight.depName && (
              <span className="hidden text-dim md:inline">· {flight.depName}</span>
            )}
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="relative h-8">
            <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded bg-edge2" />
            <div className="absolute left-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acc2" />
            <div className="absolute right-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acc2" />

            {flight.stopCodes.map((code, index) => (
              <div
                key={`${code}-${index}`}
                title={code}
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orn"
                style={{ left: `${((index + 1) / (flight.stopCodes.length + 1)) * 100}%` }}
              />
            ))}

            <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-edge bg-card px-1.5">
              <Plane
                size={14}
                className={featured ? "text-acc2" : "text-mut"}
                style={{ transform: "rotate(45deg)" }}
              />
            </div>
          </div>

          <div className="mt-2 text-center text-xs text-mut">
            {flight.duration}
            {flight.stops > 0 && ` · ${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
          </div>
          <div className="mt-1 text-center text-xs text-dim">
            {flight.stops === 0 ? "Non-stop" : `Connect via ${flight.stopCodes.join(", ")}`}
          </div>
        </div>

        <div className="min-w-0 flex-1 text-right">
          <div className="font-mono text-2xl font-bold text-txt">
            {flight.arrTime}
            {flight.dayBadge && (
              <span className="ml-1.5 font-mono text-xs font-bold text-orn">{flight.dayBadge}</span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-end gap-1.5 text-sm text-mut">
            {flight.arrTerminal && <span className="text-dim">T{flight.arrTerminal} ·</span>}
            <span className="font-medium text-txt">{flight.arrCode}</span>
            <MapPin size={12} className="text-dim" />
            {flight.arrName && (
              <span className="hidden text-dim md:inline">· {flight.arrName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- flight card ------------------------------ */
function FlightCard({
  quote,
  featured = false,
  isCheapest = false,
}: {
  quote: FlightQuote;
  featured?: boolean;
  isCheapest?: boolean;
}) {
  const { currency, openCheckout } = useStore();
  const display = displayOf(quote);
  const handleClick = () => openCheckout(quote);

  return (
    <div className="flight-card cursor-pointer p-5 transition" onClick={handleClick}>
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-3">
          <AirlineSquare code={display.code} size={44} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold leading-5 text-txt">
                {display.airlineNames}
              </span>
              <Chip>{display.carriers}</Chip>
            </div>
            <div className="mt-1 text-xs text-mut">
              {display.aircraft} • {display.cabin}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {isCheapest ? (
          <Badge tone="green" className="shrink-0">
            Best Value
          </Badge>
        ) : display.stops > 0 ? (
          <span className="badge-orn shrink-0">
            {display.duration} · {display.stops} stop{display.stops > 1 ? "s" : ""} via{" "}
            {display.stopCodes[0] ?? "—"}
          </span>
        ) : (
          <span className="badge-grn shrink-0">Non-stop</span>
        )}
      </div>

      <FlightRoute flight={display} featured={featured} />

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-edge pt-4">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tabular-nums text-txt">
            {money(quote.total_price, quote.currency, currency)}
          </span>
          <span className="text-[11px] text-dim">{paxSummary(quote) || "per quote"}</span>
          {display.bagPieces != null && (
            <span className="flex items-center gap-1 border-l border-edge pl-3 text-[11px] text-mut">
              {display.bagPieces}× {display.bagKg ?? "—"}kg
            </span>
          )}
          {display.refundable && (
            <span className="flex items-center gap-1 border-l border-edge pl-3 text-[11px] text-grn">
              <Badge tone="green">Refundable</Badge>
            </span>
          )}
        </div>

        <Button
          className="flex shrink-0 items-center gap-2 px-6 py-2.5"
          onClick={(event) => {
            event.stopPropagation();
            handleClick();
          }}
        >
          <BadgeCheck size={16} />
          <span className="font-semibold">Book</span>
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------- filter/sort bar ----------------------------- */
function FlightFilterBar({
  filters,
  onFiltersChange,
  quotes,
  onClearAll,
}: {
  filters: FlightFilters;
  onFiltersChange: (filters: Partial<FlightFilters>) => void;
  quotes: FlightQuote[];
  onClearAll: () => void;
}) {
  const nonstopCount = quotes.filter((quote) => displayOf(quote).stops === 0).length;
  const oneStopCount = quotes.filter((quote) => displayOf(quote).stops === 1).length;
  const twoPlusCount = quotes.filter((quote) => displayOf(quote).stops >= 2).length;
  const refundableCount = quotes.filter((quote) => displayOf(quote).refundable).length;

  const hasActiveFilters =
    filters.stops !== "all" || filters.timeOfDay !== "all" || filters.refundableOnly;

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
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-card/50 p-3">
      <SelectField
        label="Stops"
        variant="filter"
        value={filters.stops}
        options={stopsOptions}
        onChange={(event) =>
          onFiltersChange({ stops: event.target.value as FlightFilters["stops"] })
        }
      />

      <SelectField
        label="Departure"
        variant="filter"
        value={filters.timeOfDay}
        options={timeOptions}
        onChange={(event) =>
          onFiltersChange({ timeOfDay: event.target.value as FlightFilters["timeOfDay"] })
        }
      />

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={filters.refundableOnly}
          onChange={(event) => onFiltersChange({ refundableOnly: event.target.checked })}
          className="size-4 rounded border-edge bg-card2 text-acc accent-acc focus:ring-acc/50"
        />
        <span className="hidden text-sm text-mut sm:inline">
          Refundable only ({refundableCount})
        </span>
        <span className="text-sm text-mut sm:hidden">Refundable ({refundableCount})</span>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <SelectField
          label="Sort"
          variant="filter"
          value={`${filters.sortKey}:${filters.sortDir}`}
          options={sortOptions}
          onChange={(event) => {
            const [key, direction] = event.target.value.split(":");
            onFiltersChange({
              sortKey: key as FlightSortKey,
              sortDir: direction as SortDirection,
            });
          }}
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1.5 rounded-lg border border-edge bg-card2 px-3 py-1.5 text-sm text-dim transition hover:bg-card hover:text-mut"
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

  const filtered = useMemo(() => filterFlights(quotes, filters), [quotes, filters]);
  const sorted = useMemo(
    () => sortFlights(filtered, filters.sortKey, filters.sortDir),
    [filtered, filters.sortKey, filters.sortDir],
  );

  if (!quotes.length) return null;

  const prices = sorted.map((quote) => quote.total_price ?? Infinity);
  const cheapest = sorted[prices.indexOf(Math.min(...prices))];
  const visible = showAll ? sorted : sorted.slice(0, 4);

  const handleClearAll = () => setFilters(DEFAULT_FILTERS);
  const handleFilterChange = (partial: Partial<FlightFilters>) =>
    setFilters((previous) => ({ ...previous, ...partial }));

  return (
    <div className="space-y-4">
      <FlightFilterBar
        filters={filters}
        onFiltersChange={handleFilterChange}
        quotes={quotes}
        onClearAll={handleClearAll}
      />

      <div className="mb-2 flex items-center justify-between text-sm text-mut">
        <span>
          Showing {visible.length} of {sorted.length} option{sorted.length !== 1 ? "s" : ""}
        </span>
        {filters.stops !== "all" && (
          <span className="font-medium text-acc">
            Filtered:{" "}
            {filters.stops === "nonstop"
              ? "Non-stop"
              : filters.stops === "1stop"
                ? "1 Stop"
                : "2+ Stops"}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {sorted.length > 0 && <FlightCard quote={sorted[0]} featured />}
        {visible.slice(1).map((quote, index) => (
          <FlightCard
            key={(quote.quote_id ?? index) as string}
            quote={quote}
            isCheapest={quote === cheapest}
          />
        ))}
        {sorted.length > 4 && (
          <Button
            variant="ghost"
            className="w-full py-3"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? "Collapse list" : `View all ${sorted.length} options`}
          </Button>
        )}
      </div>

      {sorted.length === 0 && quotes.length > 0 && (
        <div className="py-10 text-center text-mut">
          <div className="mb-1 font-medium text-txt">No flights match your filters</div>
          <button type="button" className="ml-1 text-acc underline" onClick={handleClearAll}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- hotels --------------------------------- */
type HotelSortKey = "price" | "rating" | "distance" | "perNight";

interface HotelFilters {
  starRating: number | "all";
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

function sortHotels(
  quotes: HotelQuote[],
  key: HotelSortKey,
  direction: SortDirection,
): HotelQuote[] {
  return [...quotes].sort((a, b) => {
    let comparison = 0;

    switch (key) {
      case "price":
        comparison = (a.total_price ?? Infinity) - (b.total_price ?? Infinity);
        break;
      case "rating":
        comparison = (b.star_rating ?? 0) - (a.star_rating ?? 0);
        break;
      case "distance":
        comparison =
          (a.distance_to_landmark_km ?? Infinity) - (b.distance_to_landmark_km ?? Infinity);
        break;
      case "perNight":
        comparison = (a.per_room_per_night ?? Infinity) - (b.per_room_per_night ?? Infinity);
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });
}

function filterHotels(quotes: HotelQuote[], filters: HotelFilters): HotelQuote[] {
  return quotes.filter((quote) => {
    if (filters.starRating !== "all" && (quote.star_rating ?? 0) < filters.starRating) return false;
    if (filters.maxPrice !== null && (quote.total_price ?? Infinity) > filters.maxPrice)
      return false;
    if (filters.refundableOnly && !quote.refundable) return false;
    return true;
  });
}

function HotelFilterBar({
  filters,
  onFiltersChange,
  quotes,
  onClearAll,
}: {
  filters: HotelFilters;
  onFiltersChange: (filters: Partial<HotelFilters>) => void;
  quotes: HotelQuote[];
  onClearAll: () => void;
}) {
  const starCounts = {
    5: quotes.filter((quote) => (quote.star_rating ?? 0) >= 5).length,
    4: quotes.filter((quote) => (quote.star_rating ?? 0) >= 4).length,
    3: quotes.filter((quote) => (quote.star_rating ?? 0) >= 3).length,
  };
  const refundableCount = quotes.filter((quote) => quote.refundable).length;
  const maxPrice = Math.max(...quotes.map((quote) => quote.total_price ?? 0));

  const hasActiveFilters =
    filters.starRating !== "all" || filters.maxPrice !== null || filters.refundableOnly;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-card/50 p-3">
      <SelectField
        label="Rating"
        variant="filter"
        value={filters.starRating}
        options={[
          { value: "all", label: "All Stars" },
          { value: 5, label: `5★+ (${starCounts[5]})` },
          { value: 4, label: `4★+ (${starCounts[4]})` },
          { value: 3, label: `3★+ (${starCounts[3]})` },
        ]}
        onChange={(event) =>
          onFiltersChange({
            starRating: event.target.value === "all" ? "all" : Number(event.target.value),
          })
        }
      />

      <div className="flex items-center gap-2">
        <label htmlFor="maxPrice" className="hidden text-xs font-medium text-dim sm:block">
          Max Price
        </label>
        <Input
          id="maxPrice"
          variant="filter"
          type="number"
          value={filters.maxPrice ?? ""}
          onChange={(event) =>
            onFiltersChange({
              maxPrice: event.target.value ? Number.parseFloat(event.target.value) : null,
            })
          }
          placeholder={
            maxPrice > 0
              ? `Max ${money(maxPrice, quotes[0]?.currency ?? "USD", "USD")}`
              : "No limit"
          }
          className="w-32 font-mono"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={filters.refundableOnly}
          onChange={(event) => onFiltersChange({ refundableOnly: event.target.checked })}
          className="size-4 rounded border-edge bg-card2 text-acc accent-acc focus:ring-acc/50"
        />
        <span className="text-sm text-mut">Refundable only ({refundableCount})</span>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <SelectField
          label="Sort"
          variant="filter"
          value={`${filters.sortKey}:${filters.sortDir}`}
          onChange={(event) => {
            const [key, direction] = event.target.value.split(":");
            onFiltersChange({
              sortKey: key as HotelSortKey,
              sortDir: direction as SortDirection,
            });
          }}
        >
          <option value="price:asc">Total Price (Low → High)</option>
          <option value="price:desc">Total Price (High → Low)</option>
          <option value="perNight:asc">Per Night (Low → High)</option>
          <option value="perNight:desc">Per Night (High → Low)</option>
          <option value="rating:desc">Rating (High → Low)</option>
          <option value="distance:asc">Distance to Landmark (Near → Far)</option>
        </SelectField>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1.5 rounded-lg border border-edge bg-card2 px-3 py-1.5 text-sm text-dim transition hover:bg-card hover:text-mut"
        >
          <X size={13} /> Clear filters
        </button>
      )}
    </div>
  );
}

function HotelCard({ quote }: { quote: HotelQuote }) {
  const { currency, openCheckout } = useStore();
  const handleClick = () => openCheckout(quote);

  return (
    <div className="flight-card cursor-pointer p-4 transition" onClick={handleClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-acc/30 bg-acc/10 text-acc2">
            <Hotel size={20} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold leading-5">
              {quote.hotel_name || "—"}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-orn">
              {Array.from({ length: quote.star_rating ?? 0 }).map((_, index) => (
                <Star key={index} size={11} fill="currentColor" />
              ))}
              <span className="ml-1 text-dim">{quote.city}</span>
            </div>
          </div>
        </div>
        <Badge tone={quote.refundable ? "green" : "slate"}>
          {quote.refundable ? "Refundable" : "Prepaid"}
        </Badge>
      </div>

      <div className="mt-3 space-y-1 text-[12px] text-mut">
        <div className="flex justify-between">
          <span className="text-dim">Area</span>
          <span>{quote.location || "—"}</span>
        </div>
        {quote.distance_to_landmark_km != null && (
          <div className="flex justify-between">
            <span className="text-dim">Distance</span>
            <span>
              {quote.distance_to_landmark_km.toFixed(1)} km{" "}
              {quote.landmark_name ? `from ${quote.landmark_name}` : ""}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-dim">Room</span>
          <span>{quote.room_type || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">Meal plan</span>
          <span>{quote.board_basis || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">Per night</span>
          <span className="font-mono">
            {money(quote.per_room_per_night, quote.currency, currency)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-edge pt-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">
            {money(quote.total_price, quote.currency, currency)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-dim">
            <Info size={11} /> total stay
          </span>
        </div>
        <Button
          className="flex shrink-0 items-center gap-2 px-5 py-2.5"
          onClick={(event) => {
            event.stopPropagation();
            handleClick();
          }}
        >
          <BadgeCheck size={16} />
          <span className="font-semibold">Book</span>
        </Button>
      </div>
    </div>
  );
}

export function HotelResults({ result }: { result: TaskReply }) {
  const quotes = useMemo(() => (result.quotes ?? []) as HotelQuote[], [result.quotes]);
  const [filters, setFilters] = useState<HotelFilters>(DEFAULT_HOTEL_FILTERS);

  const filtered = useMemo(() => filterHotels(quotes, filters), [quotes, filters]);
  const sorted = useMemo(
    () => sortHotels(filtered, filters.sortKey, filters.sortDir),
    [filtered, filters.sortKey, filters.sortDir],
  );

  if (!quotes.length) return null;

  const priceFilter = (result.price_filter ??
    (result.output as Record<string, unknown> | null)?.price_filter ??
    null) as { matched?: number | null; note?: string | null } | null;
  const first = quotes[0];
  const landmark = first?.landmark_name;

  const handleClearAll = () => setFilters(DEFAULT_HOTEL_FILTERS);
  const handleFilterChange = (partial: Partial<HotelFilters>) =>
    setFilters((previous) => ({ ...previous, ...partial }));

  return (
    <div className="space-y-3">
      {priceFilter && priceFilter.matched === 0 && (
        <Alert tone="warning" className="flex items-start gap-2">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            {priceFilter.note ||
              "No hotel met your price cap; showing the closest available options."}
          </span>
        </Alert>
      )}

      {landmark && first?.distance_to_landmark_km != null && (
        <Alert tone="info" className="flex items-center gap-2">
          <MapPin size={14} />
          <span>
            Hotels ranked by proximity to <strong>{landmark}</strong>
          </span>
        </Alert>
      )}

      <HotelFilterBar
        filters={filters}
        onFiltersChange={handleFilterChange}
        quotes={quotes}
        onClearAll={handleClearAll}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((quote, index) => (
          <HotelCard key={(quote.quote_id ?? index) as string} quote={quote} />
        ))}
      </div>

      {sorted.length === 0 && quotes.length > 0 && (
        <div className="py-8 text-center text-mut">
          No hotels match your filters.{" "}
          <button type="button" className="ml-1 text-acc underline" onClick={handleClearAll}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
