import { useEffect, useRef, useState } from "react";
import {
  Check,
  Moon,
  RotateCcw,
  Server,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { getApiBase, setApiBase } from "../lib/api";
import { useStore, type CurrencyCode } from "../state/store";

const CURRENCIES: CurrencyCode[] = ["USD", "INR", "EUR"];

export function SettingsMenu() {
  const { theme, setTheme, currency, setCurrency, health } = useStore();
  const [open, setOpen] = useState(false);
  const [apiBase, setApiBaseDraft] = useState(() => getApiBase());
  const [saved, setSaved] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openMenu = () => {
    setApiBaseDraft(getApiBase());
    setSaved(false);
    setOpen(true);
  };

  const saveApiBase = () => {
    setApiBase(apiBase);
    setApiBaseDraft(getApiBase());
    setSaved(true);
  };

  const resetApiBase = () => {
    setApiBase("");
    setApiBaseDraft(getApiBase());
    setSaved(true);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="grid size-9 place-items-center rounded-xl text-mut transition hover:bg-card2 hover:text-txt"
        title="Settings"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Settings2 size={18} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute right-0 top-full z-50 mt-2 w-[20rem] max-w-[calc(100vw-2rem)] animate-fadeUp rounded-2xl border border-edge bg-card p-4 text-txt shadow-card"
        >
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Settings2 size={15} className="text-acc" />
              Settings
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-lg text-mut transition hover:bg-card2 hover:text-txt"
              title="Close settings"
              aria-label="Close settings"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4">
            <section>
              <div className="field-label">Appearance</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(["light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      theme === mode
                        ? "border-acc/60 bg-acc/10 text-acc"
                        : "border-edge bg-card2 text-mut hover:text-txt"
                    }`}
                    aria-pressed={theme === mode}
                  >
                    {mode === "light" ? <Sun size={14} /> : <Moon size={14} />}
                    {mode === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="field-label">Display currency</div>
              <div className="grid grid-cols-3 gap-1.5">
                {CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                      currency === code
                        ? "border-acc/60 bg-acc/10 text-acc"
                        : "border-edge bg-card2 text-mut hover:text-txt"
                    }`}
                    aria-pressed={currency === code}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </section>

            <section className="border-t border-edge pt-3.5">
              <label htmlFor="settings-api-base" className="field-label">
                Backend URL
              </label>
              <input
                id="settings-api-base"
                type="url"
                value={apiBase}
                onChange={(event) => {
                  setApiBaseDraft(event.target.value);
                  setSaved(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveApiBase();
                }}
                placeholder="http://localhost:8000"
                spellCheck={false}
                className="inset w-full px-3 py-2 text-xs outline-none focus:border-acc/60"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-dim">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${health ? "bg-grn" : "bg-red"}`}
                  />
                  <span className="truncate">
                    {health ? `Connected - ${health.environment}` : "Backend offline"}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={resetApiBase}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-mut transition hover:bg-card2 hover:text-txt"
                    title="Reset to default backend URL"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={saveApiBase}
                    className="inline-flex items-center gap-1 rounded-lg bg-acc px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-acc2"
                  >
                    {saved ? <Check size={12} /> : <Server size={12} />}
                    {saved ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
