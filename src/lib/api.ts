/**
 * HTTP + SSE client for the Travel AI Engine backend.
 *
 * Ported 1:1 from the Streamlit reference client's behaviour:
 *  - Bearer auth with proactive refresh (<=30s before expiry) and a single
 *    retry-after-refresh on 401,
 *  - `POST /chat/stream` + `POST /chat/stream/resume` consumed as SSE
 *    (`data: {...}` lines),
 *  - plain JSON helpers for health / catalog / messages / usage / trace.
 */
import type {
  Catalog,
  ChatReply,
  ConversationUsageDTO,
  StoredMessageDTO,
  StreamEvent,
  TokenResponse,
  Trace,
  UserResponse,
} from "./types";

const DEFAULT_BASE = "http://54.93.244.68:8000";

/* ------------------------------ base URL ------------------------------ */
export function getApiBase(): string {
  const override = localStorage.getItem("infarsight.apiBase");
  const env = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "";
  return (override || env || DEFAULT_BASE).replace(/\/+$/, "");
}

export function setApiBase(value: string): void {
  const clean = value.trim().replace(/\/+$/, "");
  if (clean) localStorage.setItem("infarsight.apiBase", clean);
  else localStorage.removeItem("infarsight.apiBase");
}

/* ------------------------------ auth store ----------------------------- */
export interface AuthStore {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null; // epoch seconds
  email: string | null;
}

const AUTH_KEY = "infarsight.auth";

export function loadAuth(): AuthStore {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return { access_token: null, refresh_token: null, expires_at: null, email: null, ...JSON.parse(raw) };
  } catch {
    /* corrupted storage — fall through to a clean session */
  }
  return { access_token: null, refresh_token: null, expires_at: null, email: null };
}

export function saveAuth(auth: AuthStore): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`API error ${status}: ${message.slice(0, 400)}`);
    this.status = status;
  }
}

async function rawCall(
  method: string,
  path: string,
  opts: { json?: unknown; token?: string | null; timeoutMs?: number } = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 180_000);
  try {
    const headers: Record<string, string> = {};
    if (opts.json !== undefined) headers["Content-Type"] = "application/json";
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    const res = await fetch(getApiBase() + path, {
      method,
      headers,
      body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
      signal: controller.signal,
    });
    if (res.status >= 400) {
      const detail = await res.text().catch(() => "");
      throw new ApiError(res.status, detail);
    }
    if (res.status === 204) return null;
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/* Authenticated call with the same refresh/retry policy as the reference. */
export async function apiCall(
  method: string,
  path: string,
  opts: { json?: unknown; getToken: (force?: boolean) => Promise<string | null>; onRefreshed?: () => void },
): Promise<unknown> {
  const token = await opts.getToken();
  if (token === null) throw new ApiError(401, "Not authenticated");
  try {
    return await rawCall(method, path, { json: opts.json, token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // one retry after a forced refresh
      opts.onRefreshed?.();
      const fresh = await opts.getToken(true);
      if (fresh === null) throw err;
      return rawCall(method, path, { json: opts.json, token: fresh });
    }
    throw err;
  }
}

/* --------------------------------- auth -------------------------------- */
export const apiLogin = (email: string, password: string) =>
  rawCall("POST", "/auth/login", { json: { email, password }, timeoutMs: 30_000 }) as Promise<TokenResponse>;

export const apiRegister = (email: string, password: string) =>
  rawCall("POST", "/auth/register", { json: { email, password }, timeoutMs: 30_000 }) as Promise<TokenResponse>;

export const apiRefresh = (refreshToken: string) =>
  rawCall("POST", "/auth/refresh", { json: { refresh_token: refreshToken }, timeoutMs: 30_000 }) as Promise<TokenResponse>;

export const apiMe = (token: string) =>
  rawCall("GET", "/auth/me", { token, timeoutMs: 15_000 }) as Promise<UserResponse>;

/* ------------------------------- public GETs ---------------------------- */
export interface HealthStatus {
  status: string;
  environment: string;
  latency_ms?: number;
}

export async function apiHealth(): Promise<HealthStatus> {
  const t0 = performance.now();
  const body = (await rawCall("GET", "/health", { timeoutMs: 10_000 })) as HealthStatus;
  return { ...body, latency_ms: Math.round(performance.now() - t0) };
}

export const apiCatalog = (token: string) =>
  rawCall("GET", "/catalog", { token, timeoutMs: 20_000 }) as Promise<Catalog>;

export const apiMessages = (token: string, conversationId: string) =>
  rawCall("GET", `/conversations/${conversationId}/messages`, { token }) as Promise<StoredMessageDTO[]>;

export const apiUsage = (token: string, conversationId: string) =>
  rawCall("GET", `/conversations/${conversationId}/usage`, { token }) as Promise<ConversationUsageDTO>;

export const apiTrace = (token: string, conversationId: string) =>
  rawCall("GET", `/conversations/${conversationId}/trace`, { token }) as Promise<Trace>;

/* ------------------------------ SSE streaming --------------------------- */
export interface StreamPayloads {
  send: { sender_id: string; text: string; conversation_id?: string | null };
  resume: { conversation_id: string; execution_id: string; user_input: string };
}

/**
 * POST to `/chat/stream` (or `/chat/stream/resume`) and dispatch every
 * `data: {...}` SSE line to `onEvent` as it arrives.
 */
export async function streamChat(
  path: "/chat/stream" | "/chat/stream/resume",
  payload: StreamPayloads["send"] | StreamPayloads["resume"],
  token: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(getApiBase() + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal,
  });
  if (res.status >= 400) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, detail);
  }
  if (!res.body) throw new ApiError(500, "Streaming unsupported by this browser");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      try {
        onEvent(JSON.parse(raw) as StreamEvent);
      } catch {
        /* ignore malformed keep-alive lines */
      }
    }
  }
}

export type { ChatReply };
