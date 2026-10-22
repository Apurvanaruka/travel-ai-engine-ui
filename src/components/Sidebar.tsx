import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreHorizontal as _MoreHorizontal,
  MoreVertical,
  Plus,
  X as _X,
} from "lucide-react";
import { useStore } from "../state/store";
import { Label } from "./bits";
import { UsagePanel } from "./UsagePanel";

export function Sidebar() {
  const { auth, chats, activeChat, setActiveId, newChat, renameActive, logout, loadConversation } = useStore();
  
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("infarsight:sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("infarsight:sidebarCollapsed", String(collapsed));
    } catch {
      /* ignore storage errors */
    }
  }, [collapsed]);

  const [loadId, setLoadId] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  const displayName = (auth.email ?? "traveler").split("@")[0].replace(/[._-]+/g, " ");

  const startRename = (chat: { id: string; title: string }) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };

  const handleRename = () => {
    if (renameValue.trim()) {
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
    <aside className={`flex ${collapsed ? "w-[64px]" : "w-[280px]"} shrink-0 flex-col border-r border-edge bg-panel text-txt transition-all duration-300 ease-in-out`}>
      {/* collapse / expand toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`w-full shrink-0 rounded-lg border border-edge px-3 py-2.5 transition hover:bg-card2/60 flex items-center ${collapsed ? "justify-center" : "justify-start"}`}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <button
          className={`btn-primary w-full flex items-center gap-2 px-3 ${collapsed ? "justify-center" : "justify-start"}`}
          onClick={newChat}
        >
          <Plus size={16} />
          <span className={`flex-1 truncate ${collapsed ? "hidden" : ""}`}>New Thread</span>
        </button>

        {/* chat threads */}
        <div>
          {!collapsed && (
            <div className="mb-2 flex items-center justify-between">
              <Label>Copilot Sessions</Label>
              <span className="rounded bg-card2 px-1.5 font-mono text-[10px] text-mut">{chats.length}</span>
            </div>
          )}
          <div className="space-y-1 group">
            {[...chats].reverse().map((chat) => {
              const isActive = chat.id === activeChat.id && path === "/";
              const isRenaming = renamingId === chat.id;
              return (
                <div
                  key={chat.id}
                  className={`w-full transition ${isActive ? "bg-card2 ring-1 ring-acc/40" : ""}`}
                >
                  {!isRenaming ? (
                    <button
                      onClick={() => setActiveId(chat.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition ${collapsed ? "justify-center text-center" : "justify-start text-left"} ${isActive ? "bg-card2 text-txt ring-1 ring-acc/40" : "text-mut hover:bg-card2/60 hover:text-txt"}`}
                    >
                      <MessageCircle
                        size={14}
                        className={`shrink-0 ${isActive ? "text-txt" : "text-mut"} ${!collapsed ? "mr-2" : ""}`}
                      />
                      <span className={`truncate ${collapsed ? "hidden" : "flex-1"}`}>{chat.title}</span>
                      {chat.pending && <span className={`size-1.5 shrink-0 rounded-full bg-orn ${collapsed ? "ml-2" : "ml-auto"}`} />}
                      {!collapsed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(chat); }}
                          className="ml-2 text-dim hover:text-txt opacity-0 group-hover:opacity-100"
                          title="Rename"
                        >
                          <_MoreHorizontal size={14} />
                        </button>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-card2 ring-1 ring-acc/40">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={() => handleRename()}
                        autoFocus
                        className="flex-1 bg-transparent text-sm outline-none text-txt"
                      />
                      <button
                        onClick={cancelRename}
                        className="text-dim hover:text-txt"
                        title="Cancel"
                      >
                        <_X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!collapsed && (
            <div className="mt-2 flex gap-1.5">
              <input
                value={loadId}
                onChange={(e) => setLoadId(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void doLoad(); }}
                placeholder="Load conversation id."
                className="inset w-full px-2.5 py-1.5 font-mono text-[11px] outline-none focus:border-acc/60"
              />
              <button className="btn-ghost shrink-0 px-2.5 py-1.5 text-[11px]" onClick={() => void doLoad()}>
                Load
              </button>
            </div>
          )}
          {loadErr && <div className="mt-1 text-[11px] text-red">{loadErr}</div>}
        </div>

        {/* LLM usage meter (live from /conversations/{id}/usage) */}
        {!collapsed && <UsagePanel />}
      </div>

      {/* footer: user card */}
      <div className="border-t border-edge p-3">
        <div className="inset flex items-center gap-2.5 p-2.5">
          <div
            className={`relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-acc to-acc2 ring-1 ring-edge2 font-bold text-white ${collapsed ? "size-6 text-[10px]" : "size-9 text-xs"}`}
          >
            {displayName
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
            <span
              className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-panel bg-grn ${collapsed ? "size-2" : "size-2.5"}`}
            />
          </div>
          <div className="min-w-0 flex-1">
            {!collapsed && (
              <>
                <div className="truncate text-[13px] font-semibold capitalize">{displayName}</div>
                <div className="truncate text-[11px] text-dim">Traveler</div>
              </>
            )}
          </div>
          {logoutOpen ? (
            <button
              onClick={() => {
                setLogoutOpen(false);
                logout();
              }}
              className="text-dim hover:text-txt"
              title="Log out"
            >
              Log out
            </button>
          ) : (
            <button
              onClick={() => setLogoutOpen(true)}
              className="text-dim hover:text-txt"
              title="Log out"
            >
              <MoreVertical size={16} />
            </button>
          )}
        </div>
     
      </div>
    </aside>
  );
}