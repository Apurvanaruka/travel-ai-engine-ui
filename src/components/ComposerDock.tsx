import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Paperclip,
  Mic,
  SendHorizontal,
} from "lucide-react";
import { useStore } from "../state/store";
import { Spinner } from "./bits";

export function ComposerDock() {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const { activeChat, live, send, initConversationFromUrl, view } = useStore();
  const [input, setInput] = useState("");

  // Only show composer on chat view
  if (view !== "chat" && view !== "home") return null;

  // Initialize conversation from URL
  const initRef = useRef(initConversationFromUrl);
  initRef.current = initConversationFromUrl;

  useEffect(() => {
    initRef.current(conversationId ?? null);
  }, [conversationId]);

  const pending = activeChat.pending;

  const submit = (text: string, resume = false) => {
    const value = text.trim();
    if (!value || live.active) return;
    setInput("");
    void send(value, resume);
  };

  const isEmptyThread = !activeChat.messages.length && !live.active && !pending;

  // Don't show composer in empty thread state (EmptyThread has its own composer)
  if (isEmptyThread) return null;

  return (
    <div
      className="flex-shrink-0  w-full border-t border-edge bg-panel/95 backdrop-blur-xl transition-all duration-200"
      style={{
        // No fixed left - will be positioned by flexbox layout
      }}
    >
      <div className="mx-auto max-w-5xl px-4 pb-3 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-edge bg-card px-3 py-2.5 shadow-[0_8px_28px_rgba(15,40,80,0.06)] focus-within:border-acc/50 focus-within:ring-4 focus-within:ring-acc/5 sm:px-4">
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
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none text-txt placeholder:text-dim sm:text-[14px]"
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
    </div>
  );
}