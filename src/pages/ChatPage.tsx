import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { AssistantFrame } from "../components/chat/AssistantFrame";
import { EmptyThread } from "../components/chat/EmptyThread";
import { LiveView } from "../components/chat/LiveView";
import { MessageView } from "../components/chat/MessageView";

/** Copilot chat page: history, live stream and empty-state hero. */
export function ChatPage() {
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
        {isEmptyThread ? (
          <EmptyThread
            onSelect={(prompt) => void send(prompt, false)}
            submit={(text) => void send(text, false)}
            busy={live.active}
          />
        ) : (
          <>
            <div className="space-y-6">
              {activeChat.messages.map((message, index) =>
                pending &&
                message.role === "assistant" &&
                message.content === pending.prompt ? null : (
                  <MessageView key={index} message={message} />
                ),
              )}
              {live.active && <LiveView />}
              {pending && !live.active && (
                <>
                  <AssistantFrame>
                    <div className="text-[15px] font-bold leading-6 text-txt">{pending.prompt}</div>
                  </AssistantFrame>
                  <div className="pl-12 text-[11px] text-dim">
                    Reply in the box below to continue.
                  </div>
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
