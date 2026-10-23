/**
 * TypeScript contracts mirroring the FastAPI "Travel AI Engine" payloads
 * (see /openapi.json) and the SSE stream consumed by the Streamlit reference
 * client. Shapes are kept intentionally permissive (`unknown` bags) where the
 * backend passes provider-specific metadata through.
 */

/* ---------------------------------- auth --------------------------------- */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in: number;
}

export interface UserResponse {
  email: string;
  is_active: boolean;
  created_at: string;
}

/* --------------------------------- catalog -------------------------------- */
export interface ConnectorInfo {
  id: string;
  type?: string;
  [k: string]: unknown;
}
export interface ToolInfo {
  id: string;
  type?: string;
  connector?: ConnectorInfo | null;
  [k: string]: unknown;
}
export interface AgentInfo {
  id: string;
  type?: string;
  tool?: ToolInfo | null;
  [k: string]: unknown;
}
export interface HubInfo {
  domain: string;
  type?: string;
  agent?: AgentInfo | null;
  [k: string]: unknown;
}
export interface Catalog {
  hubs: HubInfo[];
}

/* --------------------------------- quotes --------------------------------- */
export interface AirportRef {
  code?: string;
  name?: string;
}

export interface FlightSegment {
  airline?: { code?: string; name?: string } | null;
  flight_number?: string | null;
  origin_airport?: string | null;
  destination_airport?: string | null;
  departure_at?: string | null;
  arrival_at?: string | null;
  terminal_departure?: string | null;
  terminal_arrival?: string | null;
  cabin?: string | null;
  aircraft?: string | null;
}

export interface FlightLeg {
  origin?: AirportRef | null;
  destination?: AirportRef | null;
  departure_at?: string | null;
  arrival_at?: string | null;
  duration_minutes?: number | null;
  stops?: number | null;
  segments?: FlightSegment[] | null;
}

export interface FareBreakdown {
  base?: number | null;
  taxes?: number | null;
  total?: number | null;
  currency?: string | null;
  by_passenger_type?: { type: string; count: number; total: number }[] | null;
}

export interface BaggageAllowance {
  passenger_type?: string | null;
  checkin_kg?: number | null;
  cabin_kg?: number | null;
  pieces?: number | null;
}

export interface FlightQuote {
  quote_id?: string;
  provider_reference?: Record<string, unknown> | null;
  currency?: string | null;
  total_price?: number | null;
  per_passenger?: Record<string, number | null> | null;
  refundable?: boolean | null;
  valid_until?: string | null;
  cabin_class?: string | null;
  flights?: FlightLeg[] | null;
  fare_breakdown?: FareBreakdown | null;
  baggage?: BaggageAllowance[] | null;
  fare_rules?: Record<string, unknown> | null;
}

export interface HotelQuote {
  quote_id?: string;
  currency?: string | null;
  total_price?: number | null;
  hotel_name?: string | null;
  star_rating?: number | null;
  city?: string | null;
  location?: string | null;
  landmark_name?: string | null;
  distance_to_landmark_km?: number | null;
  room_type?: string | null;
  board_basis?: string | null;
  per_room_per_night?: number | null;
  refundable?: boolean | null;
}

/* ------------------------------ task results ------------------------------ */
export interface PriceFilter {
  matched?: number | null;
  note?: string | null;
  [k: string]: unknown;
}

export interface TaskReply {
  task_id?: string;
  status?: string;
  requires_user_input?: boolean;
  user_prompt?: string | null;
  error?: string | null;
  attempt?: number;
  metadata?: Record<string, unknown> | null;
  quote_count?: number | null;
  quotes?: (FlightQuote | HotelQuote)[] | null;
  price_filter?: PriceFilter | null;
  output?: Record<string, unknown> | null;
}

/* ---------------------------------- usage --------------------------------- */
export interface ModelUsageDTO {
  provider: string;
  model: string;
  calls?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  estimated_cost?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  estimated_cost_without_cache?: number;
}
export interface OperationUsageDTO {
  operation: string;
  calls?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  total_latency_ms?: number;
  estimated_cost?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}
export interface ConversationUsageDTO {
  conversation_id: string;
  calls?: number;
  successful_calls?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  total_latency_ms?: number;
  estimated_cost?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  estimated_cost_without_cache?: number;
  saved_cost?: number;
  saved_cost_percent?: number;
  cache_hit_rate?: number;
  executions?: unknown[];
  operations?: OperationUsageDTO[];
  models?: ModelUsageDTO[];
}

/* ---------------------------------- trace --------------------------------- */
export interface TraceEvent {
  event: string;
  fields?: Record<string, unknown>;
  conversation_id?: string | null;
  execution_id?: string | null;
  task_id?: string | null;
  at?: string | null;
}
export interface Trace {
  conversation_id: string;
  events: TraceEvent[];
}

/* --------------------------------- chat reply ----------------------------- */
export interface ChatReply {
  status?: string;
  conversation_id: string;
  execution_id: string;
  requires_user_input?: boolean;
  user_prompt?: string | null;
  error?: string | null;
  message?: string;
  results?: TaskReply[];
  aggregate?: Record<string, unknown> | null;
  usage?: ConversationUsageDTO | null;
}

/* ------------------------------- SSE events ------------------------------- */
export type StreamEvent =
  | { type: "started"; conversation_id: string; execution_id: string; channel?: string }
  | {
      type: "plan";
      tasks?: { task_id: string; domain?: string; capability?: string; label?: string }[];
    }
  | { type: "assistant"; text: string }
  | { type: "task"; task_id: string; label?: string; status: string }
  | { type: "done"; reply: ChatReply }
  | { type: "error"; message: string };

export interface StoredMessageDTO {
  message_id: string;
  role: string;
  content: string;
  created_at?: string | null;
}

/* ------------------------------ shared ui types --------------------------- */
export type CurrencyCode = "USD" | "INR" | "EUR";
export type ThemeMode = "light" | "dark";
/** Top-level screens; derived from the current route. */
export type View = "home" | "chat" | "checkout";

/* ------------------------------ client state ------------------------------ */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  results?: TaskReply[];
  usage?: ConversationUsageDTO | null;
  conversation_id?: string | null;
  error?: string | null;
  at: number; // epoch ms, for "Today at 10:42 AM"
}

export interface PendingInput {
  conversation_id: string;
  execution_id: string;
  prompt: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  conversation_id: string | null;
  execution_id: string | null;
  pending: PendingInput | null;
}

export interface LiveTask {
  label: string;
  status: string;
}

export interface LiveState {
  active: boolean;
  text: string;
  tasks: Record<string, LiveTask>;
  status: string;
  error: string | null;
}
