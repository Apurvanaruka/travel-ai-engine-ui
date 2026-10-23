import { useEffect, useState } from "react";
import {
  ChevronRight,
  Clock3,
  Plus,
  MoreVertical,
  X,
  MessageSquare,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { useStore } from "../state/store";
import { UsagePanel } from "./UsagePanel";
import { Logo } from "./Logo";

export function Sidebar() {
  const {
    auth,
    chats,
    activeChat,
    setActiveId,
    newChat,
    renameActive,
    logout,
    loadConversation,
  } = useStore();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("infarsight:sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });
  const [loadId, setLoadId] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("infarsight:sidebarCollapsed", String(collapsed));
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [collapsed]);

  const displayName = (auth.email ?? "traveler")
    .split("@")[0]
    .replace(/[._-]+/g, " ");

  const startRename = (chat: { id: string; title: string }) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };

  const handleRename = () => {
    if (renameValue.trim() && renamingId === activeChat.id) {
      renameActive(renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const doLoad = async () => {
    const id = loadId.trim();
    if (!id) return;
    const [ok, err] = await loadConversation(id);
    setLoadErr(ok ? null : err);
    if (ok) setLoadId("");
  };

  return (
    <aside
      className={`relative z-30 flex h-full shrink-0 flex-col border-r border-edge bg-panel text-txt transition-[width] duration-200 ${
        collapsed ? "w-[76px]" : "w-[290px]"
      }`}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex h-[68px] shrink-0 items-center gap-3 border-edge px-4">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-mut transition hover:bg-card2 hover:text-txt"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu size={18} /> : <Menu size={18} />}
        </button>
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo height="54px" className="shrink-0" />
           
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <button
          type="button"
          className={`btn-primary flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3.5 shadow-sm ${
            collapsed ? "justify-center" : "justify-start"
          }`}
          onClick={newChat}
          aria-label="Start a new search"
          title={collapsed ? "New Search" : undefined}
        >
          <Plus size={16} className="shrink-0" />
          {!collapsed && <span className="text-sm font-semibold">New Search</span>}
        </button>

        {!collapsed && (
          <>
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-mut">
                <Clock3 size={15} />
                <span>Recent Searches</span>
                <span className="ml-auto rounded-full bg-card2 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-mut">
                  {chats.length}
                </span>
              </div>

              {chats.length === 0 ? (
                <div className="rounded-xl border border-dashed border-edge px-3 py-5 text-center text-xs text-dim">
                  Your searches will appear here.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {chats.map((chat) => {
                    const isActive = chat.id === activeChat.id;
                    const isRenaming = renamingId === chat.id;

                    return (
                      <div
                        key={chat.id}
                        className={`group rounded-xl border transition ${
                          isActive
                            ? "border-acc/50 bg-acc/5 shadow-sm"
                            : "border-transparent hover:border-edge hover:bg-card2/60"
                        }`}
                      >
                        {isRenaming ? (
                          <div className="flex items-center gap-1.5 p-2">
                            <input
                              value={renameValue}
                              onChange={(event) => setRenameValue(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") handleRename();
                                if (event.key === "Escape") cancelRename();
                              }}
                              autoFocus
                              aria-label="Conversation name"
                              className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
                            />
                            <button
                              type="button"
                              onClick={cancelRename}
                              className="rounded-md p-1 text-mut hover:bg-card2 hover:text-txt"
                              title="Cancel rename"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setActiveId(chat.id)}
                              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                              aria-current={isActive ? "page" : undefined}
                            >
                              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                                isActive ? "bg-acc/10 text-acc" : "bg-card2 text-mut"
                              }`}>
                                <MessageSquare size={15} />
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-txt">
                                {chat.title || "New chat"}
                              </span>
                              {chat.pending && (
                                <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                              )}
                              <ChevronRight
                                size={15}
                                className="shrink-0 text-dim opacity-0 transition group-hover:opacity-100"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => startRename(chat)}
                              className="mr-1 rounded-lg p-1.5 text-dim opacity-0 transition hover:bg-card2 hover:text-txt focus:opacity-100 group-hover:opacity-100"
                              title="Rename conversation"
                              aria-label={`Rename ${chat.title || "conversation"}`}
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* <section className="space-y-2.5 border-t border-edge pt-5">
              <div className="px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-mut">
                Load Conversation
              </div>
              <div className="flex gap-2">
                <input
                  value={loadId}
                  onChange={(event) => {
                    setLoadId(event.target.value);
                    if (loadErr) setLoadErr(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void doLoad();
                  }}
                  placeholder="Conversation ID..."
                  aria-label="Conversation ID"
                  className="inset min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-acc/60"
                />
                <button
                  type="button"
                  className="btn-ghost rounded-xl px-3 py-2 text-xs font-semibold"
                  onClick={() => void doLoad()}
                  disabled={!loadId.trim()}
                >
                  Load
                </button>
              </div>
              {loadErr && (
                <div role="alert" className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-xs text-red">
                  {loadErr}
                </div>
              )}
            </section> */}

            <section className="space-y-2.5 border-t border-edge pt-5">
              <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-mut">
                <Search size={14} />
                LLM Usage
              </div>
              <UsagePanel />
            </section>
          </>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={newChat}
              className="grid size-10 place-items-center rounded-xl text-mut transition hover:bg-card2 hover:text-acc"
              title="Recent searches"
              aria-label="Recent searches"
            >
              <Clock3 size={18} />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="grid size-10 place-items-center rounded-xl text-mut transition hover:bg-card2 hover:text-acc"
              title="Show usage and conversation controls"
              aria-label="Show usage and conversation controls"
            >
              <Search size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Traveler account stays anchored to the bottom */}
      <div className="shrink-0 border-t border-edge p-3">
        <div className="inset flex items-center gap-2.5 rounded-xl p-2.5">
          <div className={`relative grid shrink-0 place-items-center rounded-full bg-acc font-bold text-white ring-2 ring-panel ${
            collapsed ? "size-8 text-xs" : "size-8 text-xs"
          }`}>
            {displayName
              .split(" ")
              .filter(Boolean)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-panel bg-grn" />
          </div>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold capitalize">{displayName}</div>
                <div className="truncate text-[11px] text-mut">Traveler</div>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLogoutOpen((value) => !value)}
                  className="rounded-lg p-1.5 text-mut transition hover:bg-card2 hover:text-txt"
                  title="Account menu"
                  aria-expanded={logoutOpen}
                  aria-haspopup="true"
                >
                  <MoreVertical size={17} />
                </button>
                {logoutOpen && (
                  <div className="absolute bottom-full right-0 z-40 mb-2 min-w-[150px] rounded-xl border border-edge bg-card p-1.5 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setLogoutOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red transition hover:bg-red/5"
                    >
                      <LogOut size={15} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
