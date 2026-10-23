import type { ReactNode } from "react";
import { Bot, Clock3 } from "lucide-react";
import { useStore } from "../../hooks/useStore";
import { Card } from "../common";
import { TracePanel } from "../panels/TracePanel";

/** Shared frame around every assistant response. */
export function AssistantFrame({
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
      <Card className="min-w-0 flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-2.5">
          <span className="text-[11px] font-bold tracking-[0.12em] text-acc2">
            AI TRAVEL ENGINE
          </span>
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
      </Card>
    </div>
  );
}
