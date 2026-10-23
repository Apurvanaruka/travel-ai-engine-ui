import { useState } from "react";
import { ListTree } from "lucide-react";
import { apiTrace } from "../../services/api";
import { useStore } from "../../hooks/useStore";
import type { Trace } from "../../types";

/** Orchestration trace expander — `GET /conversations/{id}/trace`. */
export function TracePanel({ conversationId }: { conversationId: string }) {
  const { getToken } = useStore();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (trace || loading) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      setTrace(await apiTrace(token, conversationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <details
      className="border-t border-edge px-4 py-2"
      onToggle={(e) => e.currentTarget.open && load()}
    >
      <summary className="flex items-center gap-1.5 text-[11px] text-dim hover:text-mut">
        <ListTree size={12} />
        Orchestration trace
        <span className="text-dim/70">{trace ? `(${trace.events.length} events)` : ""}</span>
      </summary>
      <div className="mt-2 max-h-64 overflow-auto">
        {error && <div className="text-[11px] text-red">{error}</div>}
        {loading && <div className="text-[11px] text-dim">loading…</div>}
        {trace && !trace.events.length && (
          <div className="text-[11px] text-dim">No orchestration events captured yet.</div>
        )}
        {trace && trace.events.length > 0 && (
          <table className="w-full text-left font-mono text-[10.5px] leading-4">
            <thead className="text-dim">
              <tr>
                <th className="py-1 pr-3 font-medium">time</th>
                <th className="py-1 pr-3 font-medium">event</th>
                <th className="py-1 font-medium">details</th>
              </tr>
            </thead>
            <tbody className="text-mut">
              {trace.events.map((ev, i) => (
                <tr key={i} className="border-t border-edge/60 align-top">
                  <td className="py-1 pr-3 text-dim">{(ev.at ?? "").slice(11, 19)}</td>
                  <td className="py-1 pr-3 text-acc2">{ev.event}</td>
                  <td className="py-1 break-words">
                    {Object.entries(ev.fields ?? {})
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join("  ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
