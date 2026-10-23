import { User } from "lucide-react";
import type { ChatMessage, FlightQuote, TaskReply } from "../../types";
import { clockTime, dayLabel } from "../../utils/format";
import { Alert } from "../common";
import { FlightResults, HotelResults } from "../flights/FlightResults";
import { AssistantFrame } from "./AssistantFrame";

/** True when a task result carries a quote-analysis answer. */
function isAnalysisResult(result: TaskReply): boolean {
  if ((result.metadata as Record<string, unknown> | null)?.analysis_query) return true;
  return Boolean((result.output as Record<string, unknown> | null)?.analysis_result);
}

function quoteCount(message: ChatMessage): number {
  return (message.results ?? []).reduce((count, result) => count + (result.quotes?.length ?? 0), 0);
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col items-end">
      <div className="flex w-full max-w-[80%] items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-bl-md bg-acc px-4 py-3 text-[14px] leading-6 text-white shadow-glow">
            {message.content}
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-2 text-[10.5px] text-dim">
            {dayLabel(message.at)} at {clockTime(message.at)} • Sent via Web
          </div>
        </div>
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-edge bg-card text-acc2">
          <User size={17} />
        </div>
      </div>
    </div>
  );
}

/** Renders a persisted chat message (user bubble or assistant result frame). */
export function MessageView({ message }: { message: ChatMessage }) {
  if (message.role === "user") return <UserMessage message={message} />;

  const results = message.results ?? [];
  const hasAnalysis = results.some(isAnalysisResult);
  const hasEmptyCompleted = results.some(
    (result) =>
      result.status === "completed" && !(result.quotes ?? []).length && !isAnalysisResult(result),
  );
  const showText = hasAnalysis || !results.length || hasEmptyCompleted;
  const count = quoteCount(message);
  const latency = message.usage?.total_latency_ms
    ? (message.usage.total_latency_ms / 1000).toFixed(1)
    : null;
  const meta = count
    ? `${count} options in ${latency ?? "0.8"}s`
    : latency
      ? ` in ${latency}s`
      : undefined;

  return (
    <AssistantFrame meta={meta} conversationId={message.conversation_id}>
      {message.error && <Alert tone="error">{message.error}</Alert>}

      {results.map((result, index) => {
        if (result.status === "completed" && (result.quotes ?? []).length) {
          const domain =
            ((result.metadata as Record<string, unknown> | null)?.domain as string) ?? "flight";
          return domain === "hotel" ? (
            <HotelResults key={index} result={result} />
          ) : (
            <FlightResults key={index} quotes={result.quotes as FlightQuote[]} />
          );
        }

        if (result.status === "failed" || result.error) {
          return (
            <div key={index} className="text-xs text-dim">
              Task <code className="font-mono">{result.task_id}</code> •{" "}
              <strong>{result.status}</strong> (attempt {result.attempt ?? 0})
              {result.error && (
                <div className="mt-1">
                  <Alert tone="error">{result.error}</Alert>
                </div>
              )}
            </div>
          );
        }

        return null;
      })}

      {showText && message.content && (
        <div className="whitespace-pre-wrap text-[13.5px] leading-6 text-txt">
          {message.content}
        </div>
      )}
    </AssistantFrame>
  );
}
