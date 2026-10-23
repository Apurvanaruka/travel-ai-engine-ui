import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import { PromptComposer } from "../common";

/** Docked prompt composer shown on the home / chat screens. */
export function ComposerDock() {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const { activeChat, live, send, initConversationFromUrl, view } = useStore();
  const [input, setInput] = useState("");

  // Keep the URL → conversation sync working while the dock is mounted.
  const initRef = useRef(initConversationFromUrl);
  initRef.current = initConversationFromUrl;
  useEffect(() => {
    initRef.current(conversationId ?? null);
  }, [conversationId]);

  const pending = activeChat.pending;

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || live.active) return;
    setInput("");
    void send(value, Boolean(pending));
  };

  // The empty thread renders its own hero composer.
  const isEmptyThread = !activeChat.messages.length && !live.active && !pending;

  if (view !== "chat" && view !== "home") return null;
  if (isEmptyThread) return null;

  return (
    <div className="w-full flex-shrink-0 border-t border-edge bg-panel/95 backdrop-blur-xl transition-all duration-200">
      <div className="mx-auto max-w-5xl px-4 pb-3 pt-2 sm:px-6 lg:px-8">
        <PromptComposer
          value={input}
          onChange={setInput}
          onSubmit={submit}
          pendingPrompt={pending?.prompt}
          busy={live.active}
          autoFocus
        />
      </div>
    </div>
  );
}
