import { Mic, Paperclip, SendHorizontal } from "lucide-react";
import { Input } from "./Input";
import { Spinner } from "./Spinner";

export interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** When set, the placeholder asks the traveller to answer a clarification. */
  pendingPrompt?: string | null;
  busy?: boolean;
  autoFocus?: boolean;
  size?: "default" | "large";
  placeholder?: string;
  className?: string;
}

/**
 * The chat prompt box (attachment / voice / send). Reused by the empty-state
 * hero and the docked composer so both stay visually identical.
 */
export function PromptComposer({
  value,
  onChange,
  onSubmit,
  pendingPrompt,
  busy = false,
  autoFocus = false,
  size = "default",
  placeholder = "e.g., Change date to 30 Oct, add return flight on 5 Nov, or filter non-stop only...",
  className = "",
}: PromptComposerProps) {
  const canSend = Boolean(value.trim()) && !busy;

  const submit = () => {
    if (canSend) onSubmit(value);
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-edge bg-card px-3 py-2.5 shadow-card focus-within:border-acc/50 focus-within:ring-4 focus-within:ring-acc/5 sm:px-4 ${className}`.trim()}
    >
      <button
        type="button"
        className="text-dim transition hover:text-mut"
        title="Attach"
        aria-label="Attach file"
      >
        <Paperclip size={16} />
      </button>

      <Input
        variant="bare"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={pendingPrompt ? `Your answer  •  ${pendingPrompt}` : placeholder}
        autoFocus={autoFocus}
        className={
          size === "large"
            ? "py-2 text-base text-txt placeholder:text-dim sm:text-[15px]"
            : "py-2 text-sm text-txt placeholder:text-dim sm:text-[14px]"
        }
      />

      <button
        type="button"
        className="text-dim transition hover:text-mut"
        title="Voice"
        aria-label="Voice input"
      >
        <Mic size={16} />
      </button>

      <button
        type="button"
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc text-white shadow-sm transition hover:bg-acc/85 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canSend}
        onClick={submit}
        title="Send"
        aria-label="Send message"
      >
        {busy ? (
          <Spinner size={14} className="border-white/30 border-t-white" />
        ) : (
          <SendHorizontal size={16} />
        )}
      </button>
    </div>
  );
}
