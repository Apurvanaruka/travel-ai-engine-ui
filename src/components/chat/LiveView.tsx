import { useStore } from "../../hooks/useStore";
import { Alert, Spinner } from "../common";
import { AssistantFrame } from "./AssistantFrame";

/** Live streaming state: phase label, task chips and partial assistant text. */
export function LiveView() {
  const { live } = useStore();
  const tasks = Object.values(live.tasks);

  return (
    <AssistantFrame>
      {live.error && <Alert tone="error">{live.error}</Alert>}

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
          {tasks.map((task, index) => (
            <span
              key={`${task.label}-${index}`}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                task.status === "completed"
                  ? "border-grn/40 bg-grn/10 text-grn"
                  : task.status === "running"
                    ? "border-acc/40 bg-acc/10 text-acc2"
                    : "border-edge bg-card2 text-dim"
              }`}
            >
              {task.status === "completed" ? "✓" : task.status === "running" ? "⟳" : "•"}{" "}
              {task.label}
            </span>
          ))}
        </div>
      )}

      {live.text && (
        <div className="whitespace-pre-wrap text-[13.5px] leading-6 text-txt">{live.text}</div>
      )}
    </AssistantFrame>
  );
}
