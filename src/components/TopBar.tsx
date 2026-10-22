import { useEffect, useRef, useState } from "react";
import {
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { Logo } from "./Logo";
import { useStore } from "../state/store";
import { getApiBase, setApiBase } from "../lib/api";


export function TopBar() {
  const { auth, logout, theme, setTheme } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiBase, setApiBaseLocal] = useState(getApiBase());
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-panel px-4 text-txt">
      {/* brand */}
      <div className="flex items-center gap-2.5">
        <Logo className="shrink-0" />
      </div>

      <div className="flex-1" />

      {/* Quick theme toggle */}
      <button
        className="icon-btn"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>

      <button className="icon-btn" title="Settings" onClick={() => setSettingsOpen((v) => !v)}>
        <Settings size={17} />
      </button>

      {/* settings popover */}
      {settingsOpen && (
        <div
          ref={popRef}
          className="card absolute right-4 top-14 w-80 animate-fadeUp p-4"
        >
          <div className="mb-2 text-sm font-semibold">Workspace settings</div>
          
          {/* Theme toggle */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Appearance</div>
              <div className="text-[11px] text-dim">Choose your preferred color theme</div>
            </div>
            <button
              className="btn-ghost px-3 py-1.5"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>

          <label className="field-label">Backend API base URL</label>
          <div className="flex gap-2">
            <input
              value={apiBase}
              onChange={(e) => setApiBaseLocal(e.target.value)}
              className="inset w-full px-2.5 py-1.5 font-mono text-[11px] outline-none focus:border-acc/60"
            />
            <button
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => {
                setApiBase(apiBase);
                window.location.reload();
              }}
            >
              Save
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-edge pt-3">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">{auth.email}</div>
              <div className="text-[10px] text-dim">Authenticated user</div>
            </div>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
