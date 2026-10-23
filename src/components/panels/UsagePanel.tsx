import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useStore } from "../../hooks/useStore";
import { apiUsage } from "../../services/api";
import type { ConversationUsageDTO } from "../../types";
import { Label } from "../common";

/**
 * Live LLM-usage meter for the active conversation — the React port of the
 * Streamlit sidebar meter (`GET /conversations/{id}/usage`).
 */
export function UsagePanel() {
  const { activeChat, usageVersion, getToken } = useStore();
  const [usage, setUsage] = useState<ConversationUsageDTO | null>(null);

  const conversationId = activeChat.conversation_id;

  useEffect(() => {
    let cancelled = false;
    if (!conversationId) {
      setUsage(null);
      return;
    }
    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const body = await apiUsage(token, conversationId);
        if (!cancelled) setUsage(body);
      } catch {
        if (!cancelled) setUsage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, usageVersion, getToken]);

  if (!usage) return null;

  const calls = usage.calls ?? 0;
  const tokens = usage.total_tokens ?? 0;
  const latency = ((usage.total_latency_ms ?? 0) / 1000).toFixed(1);
  const cost = usage.estimated_cost ?? 0;
  const saved = usage.saved_cost ?? 0;
  const hitRate = (usage.cache_hit_rate ?? 0) * 100;
  const ops = usage.operations ?? [];

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Zap size={12} className="text-orn" />
        <Label>LLM Usage</Label>
      </div>
      <div className="text-[13px] font-semibold leading-6">
        <span className="font-bold">{calls}</span> <span className="text-dim">calls</span>
        <span className="text-dim"> · </span>
        <span className="font-bold">{tokens.toLocaleString()}</span>{" "}
        <span className="text-dim">tokens</span>
        <span className="text-dim"> · </span>
        <span className="font-bold">{latency}s</span>
        <span className="text-dim"> · </span>
        <span className="font-bold">${cost.toFixed(4)}</span>
      </div>
      {saved > 0 && (
        <div className="text-[11px] text-grn">
          ⚡ cache {hitRate.toFixed(0)}% hit · saved ${saved.toFixed(4)}
        </div>
      )}
      {ops.length > 0 && (
        <details className="mt-1.5">
          <summary className="text-[11px] text-dim hover:text-mut">
            per-operation breakdown ({ops.length})
          </summary>
          <div className="mt-1.5 space-y-1.5 border-l border-edge pl-2.5">
            {[...ops]
              .sort((a, b) => (b.calls ?? 0) - (a.calls ?? 0))
              .map((op) => (
                <div key={op.operation} className="text-[11px] leading-4">
                  <span className="font-semibold capitalize text-mut">
                    {op.operation.replace(/[_-]+/g, " ")}
                  </span>
                  <span className="text-dim">
                    {" · "}
                    {op.calls} call{(op.calls ?? 0) === 1 ? "" : "s"} ·{" "}
                    {((op.input_tokens ?? 0) + (op.output_tokens ?? 0)).toLocaleString()} tk ·{" "}
                    {((op.total_latency_ms ?? 0) / 1000).toFixed(1)}s · $
                    {(op.estimated_cost ?? 0).toFixed(4)}
                  </span>
                  {((op.cache_read_input_tokens ?? 0) > 0 ||
                    (op.cache_creation_input_tokens ?? 0) > 0) && (
                    <span className="block font-mono text-[10px]">
                      {(op.cache_creation_input_tokens ?? 0) > 0 && (
                        <span className="text-orn">
                          created {(op.cache_creation_input_tokens ?? 0).toLocaleString()}
                        </span>
                      )}
                      {(op.cache_read_input_tokens ?? 0) > 0 && (
                        <span className="text-grn">
                          {" "}
                          read {(op.cache_read_input_tokens ?? 0).toLocaleString()}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
