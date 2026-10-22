import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  Clock3,
  Mic,
  Paperclip,
  SendHorizontal,
} from "lucide-react";
import { useStore } from "../state/store";
import type { ChatMessage, FlightQuote, TaskReply } from "../lib/types";
import { FlightResults, HotelResults } from "./FlightCard";
import { TracePanel } from "./TracePanel";
import { Spinner } from "./bits";
import { clockTime, dayLabel } from "../lib/format";

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
          <span className="text-[11px] font-bold tracking-[0.12em] text-acc2">AI TRAVEL COPILOT</span>
          <span className="size-1.5 rounded-full bg-acc2/60" />
          <span className="text-[11px] text-mut">
            {health ? `Live inventory \u00b7 ${health.environment}` : "Connecting to inventory"}
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

function MessageView({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-acc px-4 py-3 text-[14px] leading-6 text-white shadow-glow">
          {message.content}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-dim">
          {dayLabel(message.at)} at {clockTime(message.at)}  •  Sent via Web
        </div>
      </div>
    );
  }

  const results = message.results ?? [];
  const hasAnalysis = results.some(isAnalysisResult);
  const hasEmptyCompleted = results.some(
    (r) => r.status === "completed" && !(r.quotes ?? []).length && !isAnalysisResult(r),
  );
  const showText = hasAnalysis || !results.length || hasEmptyCompleted;
  const count = quoteCount(message);
  const latency = message.usage?.total_latency_ms ? (message.usage.total_latency_ms / 1000).toFixed(1) : null;
  const meta = count ? `${count} options synthesized in ${latency ?? "0.8"}s` : latency ? `synthesized in ${latency}s` : undefined;

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
              {t.status === "completed" ? "?" : t.status === "running" ? "?" : " • "} {t.label}
            </span>
          ))}
        </div>
      )}
      {live.text && <div className="whitespace-pre-wrap text-[13.5px] leading-6 text-txt">{live.text}</div>}
    </AssistantFrame>
  );
}

/** Welcome / shortcut state shown while a thread has no messages yet. */
function EmptyThread() {
  const { auth } = useStore();
  const name = (auth.email ?? "traveler").split("@")[0].split(/[._-]/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="pt-6">
      <div className="flex flex-col items-center text-center">
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-txt md:text-[40px]">
          {greeting}, <span className="capitalize">{name}</span>.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-mut">
          Where can Infarsight AI take your team next?
        </p>
      </div>
    </div>
  );
}

export function ChatView() {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const { activeChat, live, send, initConversationFromUrl } = useStore();
  const [input, setInput] = useState("");
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

  const submit = (text: string, resume = false) => {
    const value = text.trim();
    if (!value || live.active) return;
    setInput("");
    void send(value, resume);
  };

  return (
    <div ref={scroller} className="flex h-full min-h-0 flex-col bg-night text-txt">
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 pb-24 relative">
        {!activeChat.messages.length && !live.active && !pending && (
          <EmptyThread />
        )}
        {activeChat.messages.map((m, i) =>
          // the active clarification question is rendered prominently below  • 
          // skip its duplicate in the history loop (same rule as reference UI)
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
        <div ref={bottomRef} />

        {/* composer dock */}
        <div className="absolute bottom-0 left-0 right-0 z-10 w-full border-t border-edge bg-panel/95 px-4 pb-4 pt-3 backdrop-blur">
          <div className="flex items-center gap-2 rounded-xl border border-edge bg-card2 px-3 py-2 shadow-sm focus-within:border-acc/60">
            <button className="text-dim hover:text-mut" title="Attach">
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
              className="min-w-0 flex-1 bg-transparent text-sm outline-none text-txt placeholder:text-dim"
            />
            <button className="text-dim hover:text-mut" title="Voice">
              <Mic size={16} />
            </button>
            <button
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-acc text-white transition hover:bg-acc/85 disabled:opacity-50"
              disabled={live.active || !input.trim()}
              onClick={() => submit(input, !!pending)}
              title="Send"
            >
              {live.active ? <Spinner size={14} className="border-white/30 border-t-white" /> : <SendHorizontal size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
