# InfarsightAI — Corporate Travel Copilot (React + TypeScript + Tailwind)

A pixel-faithful React re-creation of the three InfarsightAI screens (home dashboard,
AI copilot chat with live flight quotes, corporate checkout), fully wired to the
**Travel AI Engine** FastAPI backend at `http://54.93.244.68:8000`.

The Streamlit project was used **only as an API reference** (endpoint paths, request
payloads, SSE event names, token-refresh policy). Every piece of internal logic —
state, streaming runner, routing, rendering — is written natively in React.

## Screens → views

| Screenshot | View | Route state |
| --- | --- | --- |
| screen 3 | Home dashboard — hero, prompt composer, active parameters, recommended workflows, trust footer | `view = "home"` |
| screen 1 | Copilot chat — user bubbles, AI assistant frames, featured/standard flight cards, hotel cards, suggestion chips, composer dock | `view = "chat"` |
| screen 2 | Review & Corporate Checkout — fare lock countdown, itinerary, passengers & enterprise profiles, policy compliance, payment methods, e-ticket emission | `view = "checkout"` |

## Quick start

```bash
cd infarsight-ui
npm install
npm run dev            # http://localhost:5173
```

Backend URL defaults to `http://54.93.244.68:8000` (the backend sends
`access-control-allow-origin: *`, so no proxy is needed). Override with:

```bash
cp .env.example .env   # edit VITE_BACKEND_URL
```

…or at runtime via the ⚙ settings popover in the topbar (persisted in localStorage).

### Login

Use any backend account, or the shared demo account pre-registered on the live
backend (the login card has a **Fill demo credentials** button):

```
demo1792562552@infarsight.ai / Demo@1234
```

You can also register a fresh account from the login screen (`POST /auth/register`).

## Backend integration (ported from the Streamlit reference)

| Concern | Endpoint | Where |
| --- | --- | --- |
| Health / GDS sync pill | `GET /health` (polled 30 s, latency measured) | `lib/api.ts`, `TopBar.tsx` |
| Login / register | `POST /auth/login`, `POST /auth/register` | `lib/api.ts`, `LoginView.tsx` |
| Token refresh (proactive ≤30 s before expiry + retry-once on 401) | `POST /auth/refresh` | `lib/api.ts`, `state/store.tsx` |
| Streaming chat (SSE `data: {…}` lines) | `POST /chat/stream` | `lib/api.ts#streamChat`, `state/store.tsx#send` |
| Clarification resume | `POST /chat/stream/resume` | same |
| Conversation history | `GET /conversations/{id}/messages` | sidebar “Load conversation id” |
| LLM usage meter (calls, tokens, latency, cost, cache hit, per-operation) | `GET /conversations/{id}/usage` | `UsagePanel.tsx` |
| Orchestration trace expander | `GET /conversations/{id}/trace` | `TracePanel.tsx` |
| Hub/agent/tool/connector catalog | `GET /catalog` | settings popover |

SSE events handled exactly like the reference client: `started`, `plan`, `assistant`,
`task`, `done`, `error` — with the same humanised phase labels (“Searching flights”,
“Analyzing quotes”, …), the same clarification (`requires_user_input` → pending bubble
+ resume) semantics, and the same rule for showing text vs. quote tables
(analysis answers and empty-search explanations are always rendered).

Quote rendering is fully data-driven from the live GDS payload: carriers & flight
numbers (`AI 191 / UA 8014`-style chips), aircraft, terminals, departure/arrival times
with `+1 Day` badges, duration, stop airports on the route line, baggage pieces,
fare breakdown (base/taxes/per-pax/refundable), cheapest-quote “Budget Corporate Tier”
badge, layover badges, and hotel proximity/price-cap notices.

## Project layout

```
src/
  lib/        types.ts (OpenAPI-mirrored contracts) · api.ts (HTTP+SSE client, auth)
              format.ts (price/time/duration/carrier helpers, currency toggle)
  state/      store.tsx (auth session, chats, SSE runner, routing, currency, health)
  components/ TopBar · Sidebar (+UsagePanel) · LoginView · HomeView · ChatView
              FlightCard (featured/standard/hotel results) · CheckoutView
              TracePanel · bits (chips, badges, route line, spinners)
scripts/      smoke.mjs — headless end-to-end test (jsdom + live backend)
```

## Scripts

```bash
npm run dev        # vite dev server
npm run build      # tsc typecheck + production build
npm run typecheck  # tsc --noEmit
node scripts/smoke.mjs   # boots the built bundle in jsdom against the LIVE backend:
                         # login → home → send prompt → streamed flight cards →
                         # usage meter → checkout → ticket issuance
```

## Notes

- Currency toggle (USD/INR/EUR) converts display prices at an indicative corporate
  desk rate (`src/lib/format.ts`); quote payloads always remain untouched.
- Corporate roster details (employee ids, loyalty tiers, passports, cost centers,
  quarterly cap) are demo enterprise data matching the mockups; passenger #1 is
  derived from the logged-in account.
- Ticket emission and fare-hold are simulated client-side (the backend exposes no
  ticketing endpoint); PNR is generated on confirm.
