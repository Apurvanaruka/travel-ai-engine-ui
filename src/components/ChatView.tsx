import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { PendingInput } from "../lib/types";
import {
  Bot,
  Clock3,
  Mic,
  Paperclip,
  SendHorizontal,
  Plane,
  Hotel,
  Bus,
  CalendarDays,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  User,
} from "lucide-react";
import { useStore } from "../state/store";
import type { ChatMessage, FlightQuote, TaskReply } from "../lib/types";
import { FlightResults, HotelResults } from "./FlightCard";
import { TracePanel } from "./TracePanel";
import { Spinner } from "./bits";
import { clockTime, dayLabel } from "../lib/format";
import { Logo } from "./Logo";


/** True when a task result carries a quote-analysis answer. */
function isAnalysisResult(result: TaskReply): boolean {
  if ((result.metadata as Record<string, unknown> | null)?.analysis_query) return true;
  return !!((result.output as Record<string, unknown> | null)?.analysis_result);
}

function quoteCount(message: ChatMessage): number {
  return (message.results ?? []).reduce((n, r) => n + (r.quotes?.length ?? 0), 0);
}

function AssistantFrame({
  children,
  meta,
  conversationId,
}: {
  children: ReactNode;
  meta?: string;
  conversationId?: string | null;
}) {
  const { health } = useStore();
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-edge bg-card text-acc2">
        <Bot size={17} />
      </div>
      <div className="card min-w-0 flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-2.5">
          <span className="text-[11px] font-bold tracking-[0.12em] text-acc2">AI TRAVEL ENGINE</span>
          <span className="size-1.5 rounded-full bg-acc2/60" />
          <span className="text-[11px] text-mut">
            {health ? `Live inventory · ${health.environment}` : "Connecting to inventory"}
          </span>
          <div className="flex-1" />
          {meta && (
            <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-dim">
              <Clock3 size={12} />
              {meta}
            </span>
          )}
        </div>
        <div className="space-y-4 px-4 py-4">{children}</div>
        {conversationId && <TracePanel conversationId={conversationId} />}
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col items-end">
      <div className="flex items-start gap-3 w-full max-w-[80%]">
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl rounded-bl-md bg-acc px-4 py-3 text-[14px] leading-6 text-white shadow-glow">
            {message.content}
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-2 text-[10.5px] text-dim">
            {dayLabel(message.at)} at {clockTime(message.at)}  •  Sent via Web
          </div>
        </div>
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-edge bg-card text-acc2">
          <User size={17} />
        </div>
      </div>
    </div>
  );
}

function MessageView({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }

  const results = message.results ?? [];
  const hasAnalysis = results.some(isAnalysisResult);
  const hasEmptyCompleted = results.some(
    (r) => r.status === "completed" && !(r.quotes ?? []).length && !isAnalysisResult(r),
  );
  const showText = hasAnalysis || !results.length || hasEmptyCompleted;
  const count = quoteCount(message);
  const latency = message.usage?.total_latency_ms ? (message.usage.total_latency_ms / 1000).toFixed(1) : null;
  const meta = count ? `${count} options in ${latency ?? "0.8"}s` : latency ? ` in ${latency}s` : undefined;

  return (
    <AssistantFrame meta={meta} conversationId={message.conversation_id}>
      {message.error && (
        <div className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-xs text-red">{message.error}</div>
      )}
      {results.map((result, i) => {
        if (result.status === "completed" && (result.quotes ?? []).length) {
          const domain = ((result.metadata as Record<string, unknown> | null)?.domain as string) ?? "flight";
          return domain === "hotel" ? (
            <HotelResults key={i} result={result} />
          ) : (
            <FlightResults key={i} quotes={result.quotes as FlightQuote[]} />
          );
        }
        if (result.status === "failed" || result.error) {
          return (
            <div key={i} className="text-xs text-dim">
              Task <code className="font-mono">{result.task_id}</code>  •  <strong>{result.status}</strong> (attempt {result.attempt ?? 0})
              {result.error && <div className="mt-1 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-red">{result.error}</div>}
            </div>
          );
        }
        return null;
      })}
      {showText && message.content && (
        <div className="whitespace-pre-wrap text-[13.5px] leading-6 text-txt">{message.content}</div>
      )}
    </AssistantFrame>
  );
}

function LiveView() {
  const { live } = useStore();
  const tasks = Object.values(live.tasks);
  return (
    <AssistantFrame>
      {live.error && (
        <div className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-xs text-red">{live.error}</div>
      )}
      {!tasks.length && !live.text ? (
        <div className="flex items-center gap-2.5">
          <Spinner size={16} />
          <span className="text-sm font-semibold">{live.status}</span>
        </div>
      ) : (
        <div className="text-xs text-mut">{live.status}</div>
      )}
      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tasks.map((t, i) => (
            <span
              key={i}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                t.status === "completed"
                  ? "border-grn/40 bg-grn/10 text-grn"
                  : t.status === "running"
                    ? "border-acc/40 bg-acc/10 text-acc2"
                    : "border-edge bg-card2 text-dim"
              }`}
            >
              {t.status === "completed" ? "✓" : t.status === "running" ? "⟳" : "•"} {t.label}
            </span>
          ))}
        </div>
      )}
      {live.text && <div className="whitespace-pre-wrap text-[13.5px] leading-6 text-txt">{live.text}</div>}
    </AssistantFrame>
  );
}

/** Welcome / shortcut state shown while a thread has no messages yet. */
function EmptyThread({ 
  onSelect, 
  submit, 
  pending, 
  live 
}: { 
  onSelect: (prompt: string) => void;
  submit: (text: string, resume: boolean) => void;
  pending: PendingInput | null;
  live: { active: boolean };
}) {
  const [input, setInput] = useState("");
  const { auth } = useStore();
  const name = (auth.email ?? "traveler").split("@")[0].split(/[._-]/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const suggestions = [
    { title: "Find flights", subtitle: "Mumbai → Delhi", prompt: "Find flights from Mumbai to Delhi on tomorrow", icon: Plane },
    { title: "Find hotels", subtitle: "Delhi, near airport", prompt: "Find hotels in Delhi near the airport from next monday to friday", icon: Hotel },
    { title: "Find Flight & Hotels", subtitle: "Delhi → Agra", prompt: "Find flights from Delhi to Agra on 5 nov and hotel from 5 nov to 10 nov", icon: Plane },
    { title: "Modify existing trip", subtitle: "Change dates or passengers", prompt: "Help me modify my existing trip", icon: CalendarDays },
  ];

  return (
    <div className="relative flex min-h-[calc(100dvh-170px)] flex-col items-center justify-center overflow-hidden px-1 pb-8 pt-8 sm:px-4">
      <div aria-hidden="true" className="pointer-events-none absolute right-[3%] top-[4%] hidden h-64 w-64 items-center justify-center rounded-full bg-acc/[0.045] md:flex">
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

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center mb-8">
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

        {/* Centered composer on empty state */}
        <div className="w-full max-w-2xl mx-auto mb-8">
          <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-edge bg-card px-3 py-2.5 shadow-[0_12px_40px_rgba(37,99,235,0.12)] focus-within:border-acc/50 focus-within:ring-4 focus-within:ring-acc/5 sm:px-4">
            <button className="text-dim hover:text-mut" title="Attach" aria-label="Attach file">
              <Paperclip size={16} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit(input, !!pending);
                }
              }}
              placeholder={
                pending
                  ? `Your answer  •  ${pending.prompt}`
                  : "e.g., Change date to 30 Oct, add return flight on 5 Nov, or filter non-stop only..."
              }
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none text-txt placeholder:text-dim sm:text-[15px]"
              autoFocus
            />
            <button className="text-dim hover:text-mut" title="Voice" aria-label="Voice input">
              <Mic size={16} />
            </button>
            <button
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc text-white shadow-sm transition hover:bg-acc/85 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={live.active || !input.trim()}
              onClick={() => submit(input, !!pending)}
              title="Send"
              aria-label="Send message"
            >
              {live.active ? <Spinner size={14} className="border-white/30 border-t-white" /> : <SendHorizontal size={16} />}
            </button>
          </div>
        </div>

        {/* Quick action suggestions below composer */}
        <div className="w-full max-w-4xl">
          <p className="text-center text-[11px] text-dim mb-4">Or start with a quick action:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {suggestions.map(({ title, subtitle, prompt, icon: Icon }) => (
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
                <ArrowUpRight size={15} className="shrink-0 text-dim transition group-hover:text-acc" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-mut">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-grn" /> Secure</span>
          <span className="hidden h-3 w-px bg-edge sm:block" />
          <span>Fast</span>
          <span className="hidden h-3 w-px bg-edge sm:block" />
          <span className="inline-flex items-center gap-1.5"><Sparkles size={13} className="text-acc" /> AI powered</span>
        </div>
      </div>
    </div>
  );
}

export function ChatView() {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const { activeChat, live, send, initConversationFromUrl } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize the conversation from the URL. The handler is read through a ref
  // so the effect only re-runs when the URL parameter itself changes - a store
  // reset must never resurrect the thread that was just discarded.
  const initRef = useRef(initConversationFromUrl);
  initRef.current = initConversationFromUrl;

  useEffect(() => {
    initRef.current(conversationId ?? null);
  }, [conversationId]);

  const messageCount = activeChat.messages.length;
  const liveText = live.text;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messageCount, liveText, live.active]);

  const pending = activeChat.pending;

  const isEmptyThread = !activeChat.messages.length && !live.active && !pending;

  return (
    <div ref={scroller} className="flex h-full min-h-0 flex-col overflow-y-auto bg-panel text-txt">
      <div className="relative mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-4 pb-32 sm:px-6 sm:py-6 lg:px-8">
        {isEmptyThread && (
          <EmptyThread
            onSelect={(prompt) => send(prompt, false)}
            submit={(text, resume) => void send(text, resume)}
            pending={pending}
            live={live}
          />
        )}
        {!isEmptyThread && (
          <>
            <div className="space-y-6">
              {activeChat.messages.map((m, i) =>
                pending && m.role === "assistant" && m.content === pending.prompt ? null : (
                  <MessageView key={i} message={m} />
                ),
              )}
              {live.active && <LiveView />}
              {pending && !live.active && (
                <>
                  <AssistantFrame>
                    <div className="text-[15px] font-bold leading-6 text-txt">{pending.prompt}</div>
                  </AssistantFrame>
                  <div className="pl-12 text-[11px] text-dim">Reply in the box below to continue.</div>
                </>
              )}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}