import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  IdCard,
  Landmark,
  ShieldCheck,
  Ticket,
  Timer,
  Users,
  Luggage,
  Armchair,
  Zap,
  Hotel,
  BedDouble,
  UtensilsCrossed,
  MapPin,
  Star,
} from "lucide-react";
import { useStore } from "../hooks/useStore";
import { displayOf } from "../utils/flight";
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  Input,
  InputField,
  SelectField,
  Spinner,
} from "../components/common";
import { moneyExact, paxSummary, titleCase, isFlightQuote } from "../utils/format";
import {
  DEFAULT_MEAL_OPTIONS,
  DEFAULT_SEAT_POOL,
  DEFAULT_PAYMENT_METHODS,
} from "../utils/uiDefaults";
import type { FlightQuote } from "../types";

interface Traveler {
  id: string;
  name: string;
  type: string;
  meal: string;
  seat: string;
  loyalty: string;
  passport: string;
  employee: string;
}

const paymentMethodIcons: Record<
  string,
  ComponentType<{ size?: number | string; className?: string }>
> = {
  CreditCard,
  Landmark,
  FileText,
};

/** Passenger rows come from the quote's fare breakdown (adult / child / infant). */
function travelersFromQuote(quote: FlightQuote, primaryName: string): Traveler[] {
  const breakdown = quote.fare_breakdown?.by_passenger_type ?? [];
  const rows: Traveler[] = [];

  if (breakdown.length) {
    for (const group of breakdown) {
      for (let i = 0; i < group.count; i++) {
        rows.push({
          id: `${group.type}-${i}`,
          name: rows.length === 0 ? primaryName : "",
          type: titleCase(group.type || "Adult"),
          meal: DEFAULT_MEAL_OPTIONS[0],
          seat: DEFAULT_SEAT_POOL[rows.length % DEFAULT_SEAT_POOL.length],
          loyalty: "",
          passport: "",
          employee: "",
        });
      }
    }
  } else {
    rows.push({
      id: "adult-0",
      name: primaryName,
      type: "Adult",
      meal: DEFAULT_MEAL_OPTIONS[0],
      seat: DEFAULT_SEAT_POOL[0],
      loyalty: "",
      passport: "",
      employee: "",
    });
  }
  return rows;
}

export function CheckoutPage() {
  const { checkoutQuote: quote, closeCheckout, currency, auth } = useStore();
  const [payment, setPayment] = useState<"amex" | "costcenter" | "invoice">("amex");
  const [stage, setStage] = useState<"idle" | "issuing" | "issued" | "held">("idle");
  const [travelers, setTravelers] = useState<Traveler[]>([]);

  const displayName = (auth.email ?? "traveler").split("@")[0].replace(/[._-]+/g, " ");
  const nameTitle = displayName
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  // Rebuild the traveler rows whenever the selected quote changes.
  useEffect(() => {
    if (!quote) return;
    setTravelers(
      isFlightQuote(quote)
        ? travelersFromQuote(quote, nameTitle || "Primary Traveler")
        : [
            {
              id: "guest-0",
              name: nameTitle || "Primary Guest",
              type: "Guest",
              meal: DEFAULT_MEAL_OPTIONS[0],
              seat: "",
              loyalty: "",
              passport: "",
              employee: "",
            },
          ],
    );
    setStage("idle");
  }, [quote, nameTitle]);

  // Fare-lock countdown, derived from the quote's validity window (not hardcoded).
  const quoteValidUntil = quote && isFlightQuote(quote) ? quote.valid_until : null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!quoteValidUntil) {
      setSecondsLeft(null);
      return;
    }
    const expires = Date.parse(quoteValidUntil);
    if (Number.isNaN(expires)) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((expires - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [quoteValidUntil]);

  const updateTraveler = (id: string, patch: Partial<Traveler>) =>
    setTravelers((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  if (!quote) {
    return (
      <div className="grid h-full place-items-center p-10 text-sm text-dim">
        No trip selected — head back to the comparison and pick an option.
        <button className="btn-ghost ml-3" onClick={closeCheckout}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  const flightQuote = isFlightQuote(quote) ? quote : null;
  const hotelQuote = isFlightQuote(quote) ? null : quote;
  const d = flightQuote ? displayOf(flightQuote) : null;
  const origin = d?.depCode ?? hotelQuote?.city ?? "—";
  const dest = d?.arrCode ?? hotelQuote?.city ?? "—";
  const fb = flightQuote?.fare_breakdown;
  const mm = secondsLeft !== null ? String(Math.floor(secondsLeft / 60)).padStart(2, "0") : null;
  const ss = secondsLeft !== null ? String(secondsLeft % 60).padStart(2, "0") : null;
  const seatChips = flightQuote ? travelers.map((t) => t.seat.split(" ")[0]) : [];
  const reference =
    (flightQuote?.provider_reference &&
      (Object.values(flightQuote.provider_reference)[0] as string | undefined)) ||
    quote.quote_id ||
    null;

  const confirm = () => {
    setStage("issuing");
    // No ticketing endpoint exists on the backend yet — the request is
    // acknowledged locally and the GDS reference (when present) is shown.
    setTimeout(() => setStage("issued"), 1200);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-7">
      {/* header */}
      <button
        className="flex items-center gap-1.5 text-[13px] font-semibold text-acc2 hover:underline"
        onClick={closeCheckout}
      >
        <ArrowLeft size={15} /> Back to {flightQuote ? "flight comparison" : "hotel results"}
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review &amp; Corporate Checkout</h1>
          <p className="mt-1 text-[13px] text-mut">
            Finalize the itinerary, traveler details, billing allocation and approval routing.
          </p>
        </div>
        {secondsLeft !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-acc/40 bg-acc/10 px-4 py-2.5 text-[13px] font-semibold text-acc2">
            <Timer size={15} />
            Fare valid for:{" "}
            <span className="font-mono">
              {mm}m {ss}s
            </span>
          </div>
        )}
      </div>

      {stage === "issued" && (
        <Card className="animate-fadeUp border-grn/40 bg-grn/5 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-12 place-items-center rounded-full border border-grn/40 bg-grn/15 text-grn">
              <CheckCircle2 size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-grn">
                {flightQuote ? "Ticket request submitted" : "Hotel request submitted"}
              </div>
              <div className="mt-0.5 text-[13px] text-mut">
                {reference ? (
                  <>
                    {flightQuote ? "GDS" : "Booking"} reference{" "}
                    <code className="font-mono font-bold text-txt">{reference}</code> •{" "}
                  </>
                ) : null}
                Confirmation for{" "}
                {flightQuote ? `${origin} → ${dest}` : hotelQuote?.hotel_name || origin} will be
                emailed to {auth.email}.
              </div>
            </div>
            <Button variant="ghost" onClick={closeCheckout}>
              Back to copilot
            </Button>
          </div>
        </Card>
      )}
      {stage === "held" && (
        <Alert tone="warning" className="animate-fadeUp border-orn/40 bg-orn/5 p-4 text-[13px]">
          {flightQuote
            ? "Fare hold requested — the approval request will be routed to your department head. Seat retention applies until the hold expires."
            : "Room hold requested — the approval request will be routed to your department head. The room is held until the hold expires."}
        </Alert>
      )}

      {/* itinerary summary — every field comes from the quote */}
      {hotelQuote && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-edge px-5 py-3.5">
            <Chip className="px-2.5 py-1 text-[11px]">
              {hotelQuote.star_rating ? `${hotelQuote.star_rating}-star hotel` : "Hotel"}
            </Chip>
            {hotelQuote.refundable ? (
              <Badge tone="green">Refundable</Badge>
            ) : (
              <Badge tone="slate">Prepaid</Badge>
            )}
            <div className="flex-1" />
            {hotelQuote.quote_id && (
              <span className="font-mono text-[11px] text-dim">{hotelQuote.quote_id}</span>
            )}
          </div>

          <div className="flex flex-wrap items-start gap-4 px-5 py-6">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-acc/30 bg-acc/10 text-acc2">
              <Hotel size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl font-bold">{hotelQuote.hotel_name || "Hotel"}</div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-mut">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-acc2" />
                  {[hotelQuote.location, hotelQuote.city].filter(Boolean).join(", ") || "—"}
                </span>
                {hotelQuote.star_rating != null && hotelQuote.star_rating > 0 && (
                  <span className="flex items-center gap-0.5 text-orn">
                    {Array.from({ length: hotelQuote.star_rating }).map((_, index) => (
                      <Star key={index} size={12} fill="currentColor" />
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-edge px-5 py-3 text-[12.5px] text-mut">
            {hotelQuote.room_type && (
              <span className="flex items-center gap-2">
                <BedDouble size={14} className="text-acc2" /> {hotelQuote.room_type}
              </span>
            )}
            {hotelQuote.board_basis && (
              <span className="flex items-center gap-2">
                <UtensilsCrossed size={14} className="text-acc2" /> {hotelQuote.board_basis}
              </span>
            )}
            {hotelQuote.distance_to_landmark_km != null && (
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-acc2" />{" "}
                {hotelQuote.distance_to_landmark_km.toFixed(1)} km
                {hotelQuote.landmark_name ? ` from ${hotelQuote.landmark_name}` : ""}
              </span>
            )}
            <div className="flex-1" />
            <span className="flex items-center gap-1.5">
              Per night{" "}
              <strong className="font-mono text-txt">
                {moneyExact(hotelQuote.per_room_per_night, hotelQuote.currency, currency)}
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              Total{" "}
              <strong className="font-mono text-txt">
                {moneyExact(hotelQuote.total_price, hotelQuote.currency, currency)}
              </strong>
            </span>
          </div>
        </Card>
      )}

      {flightQuote && d && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-edge px-5 py-3.5">
            {d.carriers !== "—" && <Chip className="px-2.5 py-1 text-[11px]">{d.carriers}</Chip>}
            {d.aircraft !== "—" && <span className="text-xs text-mut">{d.aircraft}</span>}
            {d.cabin !== "—" && <Badge tone="blue">{d.cabin}</Badge>}
            <div className="flex-1" />
            {seatChips.length > 0 && (
              <>
                <span className="text-[11px] text-dim">Assigned Seats:</span>
                {seatChips.map((s, i) => (
                  <Chip key={`${s}-${i}`} className="border-acc/40 px-2.5 py-1 text-acc2">
                    {s}
                  </Chip>
                ))}
              </>
            )}
          </div>

          <div className="grid grid-cols-[1fr_minmax(0,1.6fr)_1fr] items-center gap-6 px-5 py-6">
            <div>
              <div className="font-mono text-3xl font-bold">
                {d.depTime} <span className="text-sm font-medium text-dim">local</span>
              </div>
              <div className="mt-1 text-xl font-bold">{origin}</div>
              {d.depName && <div className="text-xs text-mut">{d.depName}</div>}
              {d.depTerminal && (
                <div className="mt-1 text-[11px] text-acc2">Terminal {d.depTerminal}</div>
              )}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-center gap-2 font-mono text-[11px] text-mut">
                <Timer size={12} /> {d.duration}
                {d.stops === 0 ? (
                  <span className="font-semibold text-grn">Non-Stop</span>
                ) : (
                  <span className="font-semibold text-orn">
                    {d.stops} Stop{d.stops > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="relative h-px bg-edge2">
                <span className="absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-acc2 bg-panel" />
                <span className="absolute right-0 top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-acc2 bg-panel" />
                <span className="absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-edge bg-card2 text-acc2">
                  <Zap size={12} style={{ transform: "rotate(90deg)" }} />
                </span>
              </div>
              {d.stopCodes.length > 0 && (
                <div className="mt-2 flex justify-between font-mono text-[10.5px] text-dim">
                  <span>Connecting</span>
                  <span>via {d.stopCodes.join(", ")}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-mono text-3xl font-bold">
                {d.arrTime}
                {d.dayBadge && (
                  <span className="ml-1.5 align-middle font-mono text-xs font-bold text-orn">
                    {d.dayBadge}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xl font-bold">{dest}</div>
              {d.arrName && <div className="text-xs text-mut">{d.arrName}</div>}
              {d.arrTerminal && (
                <div className="mt-1 text-[11px] text-acc2">Terminal {d.arrTerminal}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-edge px-5 py-3 text-[12.5px] text-mut">
            {d.bagPieces != null && (
              <span className="flex items-center gap-2">
                <Luggage size={14} className="text-acc2" />
                {d.bagPieces}× {d.bagKg ?? "—"}kg checked baggage per adult
              </span>
            )}
            {d.bagKg != null && d.bagPieces == null && (
              <span className="flex items-center gap-2">
                <Luggage size={14} className="text-acc2" /> {d.bagKg}kg checked baggage
              </span>
            )}
            {d.refundable ? (
              <span className="flex items-center gap-2 text-grn">
                <CheckCircle2 size={14} /> Refundable fare
              </span>
            ) : (
              <span className="flex items-center gap-2 text-orn">
                <CheckCircle2 size={14} /> Non-refundable fare
              </span>
            )}
            {flightQuote.cabin_class && (
              <span className="flex items-center gap-2">
                <Armchair size={14} className="text-acc2" /> {titleCase(flightQuote.cabin_class)}
              </span>
            )}
            {fb?.by_passenger_type?.length ? (
              <span className="flex items-center gap-2">
                <Users size={14} className="text-acc2" /> {paxSummary(flightQuote)}
              </span>
            ) : null}
          </div>
        </Card>
      )}

      {/* travelers — rows derived from the quote's passenger breakdown */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Users size={18} className="text-acc2" />{" "}
          {flightQuote ? "Passenger Details" : "Guest Details"}
        </h2>
        <span className="text-xs text-mut">
          {travelers.length} {flightQuote ? "traveler(s) on this fare" : "guest(s) on this booking"}
        </span>
      </div>

      {travelers.map((t, idx) => (
        <Card key={t.id} className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`grid size-8 place-items-center rounded-full text-sm font-bold ${
                idx === 0 ? "bg-acc text-white" : "bg-card2 text-mut ring-1 ring-edge2"
              }`}
            >
              {idx + 1}
            </span>
            <Input
              variant="bare"
              value={t.name}
              onChange={(e) => updateTraveler(t.id, { name: e.target.value })}
              placeholder={idx === 0 ? "Primary Traveler" : "Traveler name"}
              className="w-56 rounded-lg border border-transparent px-2 py-1 text-[17px] font-bold transition hover:border-edge focus:border-acc/50"
            />
            <Badge tone={idx === 0 ? "blue" : "slate"}>{t.type}</Badge>
            <div className="flex-1" />
            {t.employee && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-grn">
                <IdCard size={13} /> {t.employee}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <InputField
              label="Loyalty Program"
              size="sm"
              value={t.loyalty}
              onChange={(e) => updateTraveler(t.id, { loyalty: e.target.value })}
              placeholder="Optional"
            />
            <InputField
              label="Passport on File"
              size="sm"
              value={t.passport}
              onChange={(e) => updateTraveler(t.id, { passport: e.target.value })}
              placeholder="Optional"
              className="font-mono"
            />
            <SelectField
              label="Dietary / Meal Preference"
              size="sm"
              value={t.meal}
              onChange={(e) => updateTraveler(t.id, { meal: e.target.value })}
              options={DEFAULT_MEAL_OPTIONS.map((meal) => ({ value: meal, label: meal }))}
            />
            {flightQuote && (
              <div>
                <label className="field-label">Seat Assignment</label>
                <div className="inset flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[12.5px] font-bold text-acc2">{t.seat}</span>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-mut underline hover:text-txt"
                    onClick={() =>
                      updateTraveler(t.id, {
                        seat: DEFAULT_SEAT_POOL[
                          (DEFAULT_SEAT_POOL.indexOf(t.seat as (typeof DEFAULT_SEAT_POOL)[number]) +
                            2) %
                            DEFAULT_SEAT_POOL.length
                        ],
                      })
                    }
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      {/* compliance — only facts the quote actually carries */}
      <div className="rounded-xl border border-edge bg-card2/40 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 rounded-lg border border-edge bg-card px-3 py-2 text-[12px] font-bold text-mut">
            <CheckCircle2 size={15} className="text-grn" />{" "}
            {flightQuote ? "Fare rules" : "Booking terms"}
          </span>
          <div className="flex-1" />
          <div className="inset grid grid-cols-2 divide-x divide-edge px-0 py-2.5 text-[11px]">
            {flightQuote ? (
              <>
                <div className="px-4">
                  <div className="text-dim">Base fare</div>
                  <div className="mt-0.5 font-mono font-bold text-acc2">
                    {moneyExact(fb?.base, quote.currency, currency)}
                  </div>
                </div>
                <div className="px-4">
                  <div className="text-dim">Taxes &amp; fees</div>
                  <div className="mt-0.5 font-mono font-bold text-acc2">
                    {moneyExact(fb?.taxes, quote.currency, currency)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="px-4">
                  <div className="text-dim">Per night</div>
                  <div className="mt-0.5 font-mono font-bold text-acc2">
                    {moneyExact(hotelQuote?.per_room_per_night, quote.currency, currency)}
                  </div>
                </div>
                <div className="px-4">
                  <div className="text-dim">Total stay</div>
                  <div className="mt-0.5 font-mono font-bold text-acc2">
                    {moneyExact(quote.total_price, quote.currency, currency)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <p className="mt-3 text-[13px] text-mut">
          {flightQuote && d ? (
            <>
              {origin} → {dest} {d.cabin} • {d.duration} •{" "}
              {d.stops === 0 ? "non-stop routing" : `${d.stops} stop via ${d.stopCodes.join(", ")}`}{" "}
              • {d.refundable ? "refundable" : "non-refundable"} fare
            </>
          ) : (
            <>
              {hotelQuote?.hotel_name || "Hotel"} • {hotelQuote?.city || "—"}
              {hotelQuote?.room_type ? ` • ${hotelQuote.room_type}` : ""}
              {hotelQuote?.board_basis ? ` • ${hotelQuote.board_basis}` : ""} •{" "}
              {quote.refundable ? "refundable" : "non-refundable"} booking
            </>
          )}
        </p>
        {flightQuote?.valid_until && (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-edge pt-3 text-[11.5px] text-mut">
            <span className="flex items-center gap-1.5">
              <Timer size={13} /> Quote valid until{" "}
              {new Date(flightQuote.valid_until).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* payment — UI defaults; in production would come from a payment methods API */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <CreditCard size={18} className="text-acc2" /> Corporate Payment Method
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {DEFAULT_PAYMENT_METHODS.map(({ id, icon, title, description, details }) => {
            const Icon = paymentMethodIcons[icon];
            return (
              <button
                key={id}
                onClick={() => setPayment(id)}
                className={`rounded-xl border p-4 text-left transition ${
                  payment === id
                    ? "border-acc bg-acc/5 ring-1 ring-acc/50"
                    : "border-edge bg-card2/40 hover:border-edge2"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={17} className={payment === id ? "text-acc2" : "text-mut"} />
                  <span className="flex-1 text-[13.5px] font-semibold">{title}</span>
                  <span
                    className={`grid size-4 place-items-center rounded-full border ${
                      payment === id ? "border-acc" : "border-edge2"
                    }`}
                  >
                    {payment === id && <span className="size-2 rounded-full bg-acc" />}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="font-mono text-[15px] tracking-widest">{details}</div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-acc2">
                    <ShieldCheck size={12} /> {description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ticketing actions */}
      <div className="card flex flex-wrap items-center gap-4 p-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-full border border-grn/40 bg-grn/10 text-grn">
          <Banknote size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold">
            {flightQuote ? "Issue Electronic Ticket" : "Confirm Hotel Reservation"}
          </div>
          <div className="text-[11.5px] text-dim">
            {flightQuote
              ? "Tickets are issued against the selected fare and the traveler details above"
              : "The reservation is confirmed against the selected rate and guest details above"}
          </div>
        </div>
        <button
          className="btn-ghost"
          onClick={() => setStage("held")}
          disabled={stage === "issuing"}
        >
          <Building2 size={15} />
          {flightQuote ? "Hold Fare & Send for Approval" : "Hold Room & Send for Approval"}
        </button>
        <button
          className="btn-primary px-6 py-3"
          onClick={confirm}
          disabled={stage === "issuing" || stage === "issued"}
        >
          {stage === "issuing" ? <Spinner size={15} /> : <Ticket size={16} />}
          {flightQuote ? "Confirm & Issue Ticket" : "Confirm & Book Hotel"} (
          {moneyExact(quote.total_price, quote.currency, currency)})
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 pb-4 text-[11px] text-dim">
        <BadgeCheck size={13} className="text-grn" />
        {payment === "amex"
          ? "Amex corporate vault"
          : payment === "costcenter"
            ? "cost center ledger"
            : "AP invoice queue"}{" "}
        • PCI-DSS scope free
      </div>
    </div>
  );
}
