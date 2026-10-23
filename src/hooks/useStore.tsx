/**
 * Application store: auth session (with token refresh), chat threads,
 * the live SSE stream runner, view routing, currency and backend health.
 * All orchestration logic is React-native here; the Streamlit project was
 * used only as an API reference.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  apiCall,
  apiHealth,
  apiLogin,
  apiMessages,
  apiRefresh,
  apiRegister,
  loadAuth,
  saveAuth,
  streamChat,
  type AuthStore,
  type HealthStatus,
} from "../services/api";
import type {
  Chat,
  ChatMessage,
  ConversationUsageDTO,
  CurrencyCode,
  FlightQuote,
  LiveState,
  StreamEvent,
  ThemeMode,
  View,
} from "../types";

export type { CurrencyCode, ThemeMode, View } from "../types";

/** Theme explicitly saved by the user, or null when they have not chosen one. */
function readStoredTheme(): ThemeMode | null {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage may be unavailable in private browsing.
  }
  return null;
}

/** The operating system / browser colour preference. */
function readSystemTheme(): ThemeMode {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

const IDLE_LIVE: LiveState = {
  active: false,
  text: "",
  tasks: {},
  status: "Thinking • ",
  error: null,
};

/** The conversation id carried by a location search string, if any. */
function currentConversationId(search: string): string | null {
  return new URLSearchParams(search).get("conversation");
}
/** URL of one specific conversation on the chat page (root route). */
function conversationPath(conversationId: string): string {
  return `/?conversation=${encodeURIComponent(conversationId)}`;
}

/** True for the rejection produced by an aborted fetch / SSE stream. */
function isAbortError(err: unknown): boolean {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return err.name === "AbortError";
  }
  return err instanceof Error && err.name === "AbortError";
}

function uid(): string {
  // crypto.randomUUID needs a secure context; fall back for plain-HTTP LAN use
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

function newChat(): Chat {
  return {
    id: uid(),
    title: "New chat",
    messages: [],
    conversation_id: null,
    execution_id: null,
    pending: null,
  };
}

/** Raw 'domain capability' label → friendly phase name (as in reference UI). */
function humanizeTask(label: string): string {
  const capability = label ? (label.split(/\s+/).pop() ?? "") : "";
  const map: Record<string, string> = {
    flight_quote: "Searching flights",
    quote_analysis: "Analyzing quotes",
    hotel_quote: "Searching hotels",
    hotel_analysis: "Analyzing hotels",
    rail_quote: "Searching trains",
    car_rental_quote: "Searching car rentals",
    cruise_quote: "Searching cruises",
  };
  return map[capability] ?? (label || "Working");
}

interface StoreValue {
  /* auth */
  auth: AuthStore;
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<[boolean, string]>;
  register: (email: string, password: string) => Promise<[boolean, string]>;
  logout: () => void;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  authedCall: <T>(method: string, path: string, json?: unknown) => Promise<T>;
  /* navigation / ui */
  view: View;
  go: (view: View) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  health: HealthStatus | null;
  /* env label / options */
  envLabel: string;
  setEnvLabel: (label: string) => void;
  options: { search?: string };
  toggleDarkMode: () => void;
  /* chats */
  chats: Chat[];
  activeChat: Chat;
  setActiveId: (id: string) => void;
  newChat: () => void;
  loadConversation: (id: string) => Promise<[boolean, string]>;
  /** Initialize or load a conversation from URL (e.g., /chat/:conversationId) */
  initConversationFromUrl: (conversationId: string | null) => void;
  renameActive: (title: string) => void;
  send: (text: string, resume?: boolean) => Promise<void>;
  live: LiveState;
  usageVersion: number;
  /* checkout */
  checkoutQuote: FlightQuote | null;
  openCheckout: (quote: FlightQuote) => void;
  closeCheckout: () => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthStore>(() => loadAuth());
  const authRef = useRef(auth);
  const setAuth = useCallback((next: AuthStore) => {
    authRef.current = next;
    saveAuth(next);
    setAuthState(next);
  }, []);

  const [chats, setChats] = useState<Chat[]>(() => [newChat()]);
  const [activeId, setActiveId] = useState<string>(() => chats[0].id);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [{ theme: initialTheme, explicit: initialThemeExplicit }] = useState(() => {
    const stored = readStoredTheme();
    return { theme: stored ?? readSystemTheme(), explicit: stored !== null };
  });
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);
  /** Once the user picks a theme, stop following the device preference. */
  const themeExplicitRef = useRef(initialThemeExplicit);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [live, setLive] = useState<LiveState>(IDLE_LIVE);
  const [usageVersion, setUsageVersion] = useState(0);
  const [checkoutQuote, setCheckoutQuote] = useState<FlightQuote | null>(null);
  const [envLabel, setEnvLabel] = useState("");
  const [options] = useState<{ search?: string }>({});

  /* ------------------------- thread isolation ---------------------------- */
  /** Abort handle for the in-flight SSE stream of the current thread. */
  const streamAbortRef = useRef<AbortController | null>(null);
  /**
   * Bumped every time a brand-new thread starts. Callbacks belonging to an
   * older generation are ignored, so a late SSE event can never write into a
   * thread that has already been discarded.
   */
  const threadGenRef = useRef(0);
  /**
   * Conversation ids dropped by a thread reset. They are never auto-reloaded
   * from the URL; they stay reachable only through an explicit "Load
   * conversation id" request.
   */
  const discardedRef = useRef<Set<string>>(new Set());

  const navigate = useNavigate();
  const location = useLocation();

  /* View is derived from the URL so routes and state never drift apart. */
  const view: View = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/booking") || p.startsWith("/checkout")) return "checkout";
    if (p.startsWith("/chat")) return "chat";
    return "home";
  }, [location.pathname]);

  const bump = useCallback(() => setChats((c) => [...c]), []);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) ?? chats[0],
    [chats, activeId],
  );

  /** Latest active chat, readable from callbacks without re-creating them. */
  const activeChatRef = useRef<Chat>(activeChat);
  activeChatRef.current = activeChat;

  /* ------------------------------ health poll ----------------------------- */
  useEffect(() => {
    // poll backend health (also gives us the GDS sync latency pill)
    const poll = () => {
      apiHealth()
        .then(setHealth)
        .catch(() => setHealth(null));
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, []);

  /* -------------------------------- theme -------------------------------- */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "light" ? "#ffffff" : "#0a0a0a");
    }
  }, [theme]);

  /* Follow the device theme until the user makes an explicit choice. */
  useEffect(() => {
    if (themeExplicitRef.current) return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (themeExplicitRef.current) return;
      setThemeState(event.matches ? "dark" : "light");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    themeExplicitRef.current = true;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage may be unavailable in private browsing.
    }
    setThemeState(next);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  /* --------------------------------- auth -------------------------------- */
  const expired = (a: AuthStore) => !a.expires_at || a.expires_at - Date.now() / 1000 <= 30;

  const refresh = useCallback(async (): Promise<boolean> => {
    const rt = authRef.current.refresh_token;
    if (!rt) return false;
    try {
      const body = await apiRefresh(rt);
      if (!body?.access_token) return false;
      setAuth({
        access_token: body.access_token,
        refresh_token: body.refresh_token ?? rt,
        expires_at: Date.now() / 1000 + (body.expires_in ?? 0),
        email: authRef.current.email,
      });
      return true;
    } catch {
      setAuth({ access_token: null, refresh_token: null, expires_at: null, email: null });
      return false;
    }
  }, [setAuth]);

  const getToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      const a = authRef.current;
      if (!a.access_token) return null;
      if (forceRefresh || expired(a)) {
        const ok = await refresh();
        if (!ok) return null;
      }
      return authRef.current.access_token;
    },
    [refresh],
  );

  const authedCall = useCallback(
    async <T,>(method: string, path: string, json?: unknown): Promise<T> => {
      return (await apiCall(method, path, {
        json,
        getToken,
        onRefreshed: () => setUsageVersion((v) => v + 1),
      })) as T;
    },
    [getToken],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<[boolean, string]> => {
      try {
        const body = await apiLogin(email, password);
        if (!body?.access_token) return [false, "Login failed  •  check your credentials."];
        setAuth({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
          expires_at: Date.now() / 1000 + (body.expires_in ?? 0),
          email,
        });
        return [true, ""];
      } catch (err) {
        return [false, err instanceof Error ? err.message : String(err)];
      }
    },
    [setAuth],
  );

  const register = useCallback(
    async (email: string, password: string): Promise<[boolean, string]> => {
      try {
        const body = await apiRegister(email, password);
        if (!body?.access_token) return [false, "Registration failed."];
        setAuth({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
          expires_at: Date.now() / 1000 + (body.expires_in ?? 0),
          email,
        });
        return [true, ""];
      } catch (err) {
        return [false, err instanceof Error ? err.message : String(err)];
      }
    },
    [setAuth],
  );

  const logout = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    threadGenRef.current += 1;
    setAuth({ access_token: null, refresh_token: null, expires_at: null, email: null });
    const fresh = newChat();
    setChats([fresh]);
    setActiveId(fresh.id);
    setCheckoutQuote(null);
    setLive(IDLE_LIVE);
    setUsageVersion(0);
    navigate("/login");
  }, [setAuth, navigate]);

  /* --------------------------------- chats -------------------------------- */
  /**
   * Start a completely fresh thread.
   *
   * Nothing from the previous thread survives: the in-flight stream is
   * aborted, late callbacks are invalidated, the live/usage/checkout state is
   * cleared and the chat list is replaced by the new (empty) thread.
   */
  const newChatAction = useCallback(() => {
    // 1) stop any in-flight stream so its events cannot land in the new thread
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;

    // 2) invalidate every callback belonging to the discarded thread
    threadGenRef.current += 1;

    // 3) drop all per-thread state (live stream, usage meter, checkout quote)
    setLive(IDLE_LIVE);
    setUsageVersion(0);
    setCheckoutQuote(null);

    // 4) start a brand-new thread — the previous one is not carried over
    for (const c of chats) {
      if (c.conversation_id) discardedRef.current.add(c.conversation_id);
    }
    // keep the guard set bounded
    if (discardedRef.current.size > 50) {
      const oldest = discardedRef.current.values().next().value;
      if (oldest) discardedRef.current.delete(oldest);
    }
    const chat = newChat();
    setChats([chat]);
    setActiveId(chat.id);

    navigate("/");
  }, [chats, navigate]);

  const renameActive = useCallback(
    (title: string) => {
      activeChat.title = title.trim().slice(0, 48) || "New chat";
      bump();
    },
    [activeChat, bump],
  );

  const loadConversation = useCallback(
    async (id: string): Promise<[boolean, string]> => {
      try {
        const msgs = await authedCall<Awaited<ReturnType<typeof apiMessages>>>(
          "GET",
          `/conversations/${id}/messages`,
        );
        if (chats.some((c) => c.conversation_id === id)) {
          const existing = chats.find((c) => c.conversation_id === id)!;
          setActiveId(existing.id);
          return [true, ""];
        }
        const firstUser = msgs.find((m) => m.role === "user");
        const chat: Chat = {
          id: uid(),
          title: (firstUser?.content ?? "Loaded conversation").slice(0, 48),
          messages: msgs.map<ChatMessage>((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
            results: [],
            usage: null,
            conversation_id: id,
            error: null,
            at: m.created_at ? Date.parse(m.created_at) : Date.now(),
          })),
          conversation_id: id,
          execution_id: null,
          pending: null,
        };
        setChats((c) => [...c, chat]);
        setActiveId(chat.id);
        navigate(conversationPath(id));
        return [true, ""];
      } catch (err) {
        return [false, err instanceof Error ? err.message : String(err)];
      }
    },
    [authedCall, chats, navigate],
  );

  /** Initialize or load a conversation from URL (e.g., /chat/:conversationId) */
  const initConversationFromUrl = useCallback(
    (conversationId: string | null) => {
      if (!conversationId) {
        // No conversation id in the URL. Keep the current chat; only fall back
        // to a fresh draft when the active one is still empty.
        const active = chats.find((c) => c.id === activeId) ?? chats[0];
        if (!active?.messages.length && !active?.conversation_id) {
          const unused = chats.find((c) => !c.messages.length && !c.conversation_id);
          if (unused) setActiveId(unused.id);
        } else if (
          active?.conversation_id &&
          currentConversationId(location.search) !== active.conversation_id
        ) {
          navigate(conversationPath(active.conversation_id), { replace: true });
        }
        return;
      }

      // This conversation was discarded by a thread reset — do not resurrect it.
      if (discardedRef.current.has(conversationId)) return;

      // Check if already loaded
      const existing = chats.find((c) => c.conversation_id === conversationId);
      if (existing) {
        if (existing.id !== activeId) setActiveId(existing.id);
        if (currentConversationId(location.search) !== conversationId) {
          navigate(conversationPath(conversationId), { replace: true });
        }
        return;
      }

      // Load from server
      loadConversation(conversationId);
    },
    [activeId, chats, loadConversation, navigate, location.search],
  );

  /* ---------------------------- streaming runner --------------------------- */
  const send = useCallback(
    async (text: string, resume = false): Promise<void> => {
      // Only one stream may be in flight: a new send supersedes the previous one.
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;

      // Which thread this stream belongs to — checked on every event.
      const generation = threadGenRef.current;

      const chat = chats.find((c) => c.id === activeId) ?? chats[0];
      const pending = chat.pending;
      chat.messages.push({ role: "user", content: text, at: Date.now() });
      if (!resume && chat.title === "New chat") chat.title = text.slice(0, 48);
      if (resume && pending) chat.pending = null;
      bump();
      if (location.pathname !== "/") navigate("/");
      setLive({ ...IDLE_LIVE, active: true });

      const token = await getToken();
      if (!token) {
        setLive({ ...IDLE_LIVE, error: "Please log in to continue." });
        return;
      }

      const path = resume && pending ? "/chat/stream/resume" : "/chat/stream";
      const payload =
        resume && pending
          ? {
              conversation_id: pending.conversation_id,
              execution_id: pending.execution_id,
              user_input: text,
            }
          : { sender_id: "react-web", text, conversation_id: chat.conversation_id };

      const buf = {
        text: "",
        tasks: {} as Record<string, { label: string; status: string }>,
        error: null as string | null,
      };
      let doneReceived = false;

      const phaseLabel = (): string => {
        const tasks = Object.values(buf.tasks);
        const running = tasks.filter((t) => t.status === "running");
        if (running.length) return `• ${running[running.length - 1].label} • `;
        if (tasks.length) {
          const steps = tasks
            .filter((t) => t.status === "completed")
            .map((t) => `✓ ${t.label}`)
            .join("  •  ");
          const waiting = tasks.some((t) => t.status === "waiting");
          if (waiting) return `${steps}   •   ⏳ waiting for your answer`;
          return `${steps}   •   ✓ Done`;
        }
        return "Thinking • ";
      };

      const onEvent = (event: StreamEvent) => {
        // A newer thread (or a newer send) has taken over — drop this event.
        if (generation !== threadGenRef.current) return;
        switch (event.type) {
          case "started":
            chat.conversation_id = event.conversation_id;
            chat.execution_id = event.execution_id;
            bump();
            break;
          case "plan":
            for (const t of event.tasks ?? []) {
              buf.tasks[t.task_id] = {
                label: humanizeTask(t.label ?? `${t.domain} ${t.capability}`),
                status: "running",
              };
            }
            break;
          case "assistant":
            buf.text += event.text ?? "";
            break;
          case "task":
            buf.tasks[event.task_id] = {
              label: humanizeTask(event.label ?? ""),
              status: event.status ?? "running",
            };
            break;
          case "done": {
            doneReceived = true;
            const reply = event.reply;
            chat.conversation_id = reply.conversation_id;
            chat.execution_id = reply.execution_id;
            let content = reply.message ?? "";
            if (!content && reply.requires_user_input) {
              content = reply.user_prompt || "Additional information is required.";
            }
            chat.messages.push({
              role: "assistant",
              content,
              results: reply.results ?? [],
              usage: (reply.usage ?? null) as ConversationUsageDTO | null,
              conversation_id: reply.conversation_id,
              error: reply.error ?? null,
              at: Date.now(),
            });
            chat.pending = reply.requires_user_input
              ? {
                  conversation_id: reply.conversation_id,
                  execution_id: reply.execution_id,
                  prompt: reply.user_prompt || "Additional information is required.",
                }
              : null;
            setUsageVersion((v) => v + 1);
            bump();
            break;
          }
          case "error":
            buf.error = (event as { message?: string }).message ?? "Unknown error";
            break;
          default:
            break;
        }
        setLive({
          active: true,
          text: buf.text,
          tasks: { ...buf.tasks },
          status: phaseLabel(),
          error: buf.error,
        });
      };

      let aborted = false;
      try {
        await streamChat(path, payload, token, onEvent, controller.signal);
      } catch (err) {
        if (isAbortError(err)) {
          aborted = true;
        } else {
          buf.error = err instanceof Error ? err.message : String(err);
        }
      }

      // The thread was replaced while we were streaming — leave it alone.
      if (generation !== threadGenRef.current) return;

      // Superseded by another send: do not write a partial result into the chat.
      if (aborted) {
        if (streamAbortRef.current === controller) streamAbortRef.current = null;
        return;
      }

      if (!doneReceived) {
        chat.messages.push({
          role: "assistant",
          content: buf.text || "The request ended without a result.",
          results: [],
          usage: null,
          conversation_id: chat.conversation_id,
          error: buf.error,
          at: Date.now(),
        });
        bump();
      }
      setLive({ ...IDLE_LIVE, error: buf.error });
      setUsageVersion((v) => v + 1);
      if (streamAbortRef.current === controller) streamAbortRef.current = null;
    },
    [activeId, bump, chats, getToken, navigate, location.pathname],
  );

  /* ------------------------------- checkout ------------------------------- */
  const openCheckout = useCallback(
    (quote: FlightQuote) => {
      setCheckoutQuote(quote);
      navigate("/booking");
      window.scrollTo({ top: 0 });
    },
    [navigate],
  );
  const closeCheckout = useCallback(() => {
    navigate("/");
    window.scrollTo({ top: 0 });
  }, [navigate]);

  const go = useCallback(
    (v: View) => {
      if (v === "home") navigate("/");
      else if (v === "chat") {
        const cid = activeChatRef.current?.conversation_id;
        navigate(cid ? conversationPath(cid) : "/");
      } else navigate("/booking");
      window.scrollTo({ top: 0 });
    },
    [navigate],
  );

  const value: StoreValue = {
    auth,
    loggedIn: !!auth.access_token,
    login,
    register,
    logout,
    getToken,
    authedCall,
    view,
    go,
    currency,
    setCurrency,
    theme,
    setTheme,
    health,
    envLabel,
    setEnvLabel,
    options,
    toggleDarkMode,
    chats,
    activeChat,
    setActiveId: (id) => {
      setActiveId(id);
      const target = chats.find((c) => c.id === id);
      const cid = target?.conversation_id;
      navigate(cid ? conversationPath(cid) : "/");
    },
    newChat: newChatAction,
    loadConversation,
    initConversationFromUrl,
    renameActive,
    send,
    live,
    usageVersion,
    checkoutQuote,
    openCheckout,
    closeCheckout,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
