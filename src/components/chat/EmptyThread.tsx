import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Hotel,
  MapPin,
  Plane,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useStore } from "../../hooks/useStore";
import { Logo, PromptComposer } from "../common";

const SUGGESTIONS = [
  {
    title: "Find flights",
    subtitle: "Mumbai → Delhi",
    prompt: "Find flights from Mumbai to Delhi on tomorrow",
    icon: Plane,
  },
  {
    title: "Find hotels",
    subtitle: "Delhi, near airport",
    prompt: "Find hotels in Delhi near the airport from next monday to friday",
    icon: Hotel,
  },
  {
    title: "Find Flight & Hotels",
    subtitle: "Delhi → Agra",
    prompt: "Find flights from Delhi to Agra on 5 nov and hotel from 5 nov to 10 nov",
    icon: Plane,
  },
  {
    title: "Modify existing trip",
    subtitle: "Change dates or passengers",
    prompt: "Help me modify my existing trip",
    icon: CalendarDays,
  },
] as const;

/** Welcome / shortcut state shown while a thread has no messages yet. */
export function EmptyThread({
  onSelect,
  submit,
  pendingPrompt,
  busy,
}: {
  onSelect: (prompt: string) => void;
  submit: (text: string) => void;
  pendingPrompt?: string | null;
  busy: boolean;
}) {
  const [input, setInput] = useState("");
  const { auth } = useStore();

  const name = (auth.email ?? "traveler").split("@")[0].split(/[._-]/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative flex min-h-[calc(100dvh-170px)] flex-col items-center justify-center overflow-hidden px-1 pb-8 pt-8 sm:px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[3%] top-[4%] hidden h-64 w-64 items-center justify-center rounded-full bg-acc/[0.045] md:flex"
      >
        <div className="absolute inset-5 rounded-full border border-dashed border-acc/15" />
        <div className="absolute inset-12 rounded-full border border-acc/10" />
        <div className="absolute right-5 top-10 grid size-11 place-items-center rounded-2xl bg-card text-acc shadow-sm">
          <Plane size={20} />
        </div>
        <div className="absolute bottom-12 left-8 grid size-10 place-items-center rounded-full bg-acc/10 text-acc">
          <MapPin size={20} />
        </div>
        <div className="absolute left-12 top-12 size-2 rounded-full bg-acc/30" />
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center">
        <div className="mx-auto mb-8 flex max-w-3xl flex-col items-center text-center">
          <div className="mb-5 grid size-14 place-items-center rounded-2xl border border-acc/15 bg-card text-acc shadow-sm">
            <Logo variant="mark" height="26px" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-edge bg-card/80 px-3 py-1.5 text-[11px] font-semibold text-mut shadow-sm">
            <Sparkles size={13} className="text-acc" />
            YOUR AI-POWERED TRAVEL ASSISTANT
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-txt sm:text-4xl md:text-5xl">
            {greeting}, <span className="capitalize">{name}</span>.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-mut sm:text-base">
            Where can Infarsight AI take your team next?
            <span className="mt-1 block text-xs sm:text-sm">
              Plan a trip, compare options, or update an existing itinerary — just ask.
            </span>
          </p>
        </div>

        <div className="mx-auto mb-8 w-full max-w-2xl">
          <PromptComposer
            value={input}
            onChange={setInput}
            onSubmit={submit}
            pendingPrompt={pendingPrompt}
            busy={busy}
            size="large"
            autoFocus
            className="shadow-[0_12px_40px_rgba(37,99,235,0.12)]"
          />
        </div>

        <div className="w-full max-w-4xl">
          <p className="mb-4 text-center text-[11px] text-dim">Or start with a quick action:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SUGGESTIONS.map(({ title, subtitle, prompt, icon: Icon }) => (
              <button
                key={title}
                type="button"
                onClick={() => onSelect(prompt)}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-edge bg-card/90 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-acc/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-acc"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-acc/8 text-acc transition group-hover:bg-acc/12">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-txt">{title}</span>
                  <span className="mt-1 block truncate text-[11px] text-mut">{subtitle}</span>
                </span>
                <ArrowUpRight
                  size={15}
                  className="shrink-0 text-dim transition group-hover:text-acc"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-mut">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-grn" /> Secure
          </span>
          <span className="hidden h-3 w-px bg-edge sm:block" />
          <span>Fast</span>
          <span className="hidden h-3 w-px bg-edge sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={13} className="text-acc" /> AI powered
          </span>
        </div>
      </div>
    </div>
  );
}
