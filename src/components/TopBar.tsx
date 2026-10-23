import { useStore } from "../state/store";
import { Sun, Moon, Clock3 } from "lucide-react";
import { Logo } from "./Logo";
import { SettingsMenu } from "./SettingsMenu";

export function TopBar() {
  const { toggleDarkMode, theme, activeChat } = useStore();

  const totalQuotes = activeChat.messages.reduce(
    (total, message) =>
      total +
      (message.results ?? []).reduce(
        (count, result) => count + (result.quotes?.length ?? 0),
        0,
      ),
    0,
  );

  const lastUsage = activeChat.messages[activeChat.messages.length - 1]?.usage;
  const latency = lastUsage?.total_latency_ms
    ? (lastUsage.total_latency_ms / 1000).toFixed(1)
    : null;

  return (
    <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-4 border-b border-edge bg-card/90 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
          <Logo variant="mark" height="26px" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold tracking-tight text-txt">
            AI Travel Engine
          </div>
     
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {(totalQuotes > 0 || latency) && (
          <div className="hidden items-center gap-2 text-xs text-mut lg:flex">
            <Clock3 size={15} className="text-acc" />
            <span>
              {totalQuotes > 0 && (
                <>
                  <strong className="font-semibold text-txt">{totalQuotes}</strong>{" "}
                  option{totalQuotes === 1 ? "" : "s"}
                </>
              )}
              {totalQuotes > 0 && latency ? "" : ""}
              {totalQuotes === 0 && latency ? "Elapsed " : ""}
              {latency && <strong className="font-semibold text-txt">{latency}s</strong>}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleDarkMode}
          className="grid size-9 place-items-center rounded-xl text-mut transition hover:bg-card2 hover:text-txt"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <SettingsMenu />
      </div>
    </header>
  );
}
