/**
 * Headless end-to-end smoke test (no browser): boots the production bundle
 * inside jsdom against the LIVE backend, logs in, sends a real booking
 * prompt through the React composer, waits for the streamed flight cards,
 * then clicks "Book" and verifies the corporate checkout screen renders.
 *
 *   node scripts/smoke.mjs
 */
import { JSDOM, VirtualConsole } from "jsdom";
import { readdirSync } from "node:fs";
import path from "node:path";

const BASE = "http://54.93.244.68:8000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------- real login first --------------------------- */
const email = process.env.SMOKE_EMAIL || "demo1792562552@infarsight.ai";
const password = process.env.SMOKE_PASSWORD || "Demo@1234";
let login = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) {
  // register a throwaway account if the shared demo one is gone
  const alt = `smoke${Date.now()}@infarsight.ai`;
  await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: alt, password }),
  });
  login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: alt, password }),
  });
}
const tokens = await login.json();
console.log("• backend login ok:", email);

/* ------------------------------- jsdom boot ------------------------------ */
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => {
  if (!/Not implemented/.test(String(e.message))) console.error("JSDOM ERROR:", e.message);
});
vc.on("error", (m) => console.error("CONSOLE ERROR:", m));

const dom = new JSDOM(
  `<!doctype html><html><body><div id="root"></div></body></html>`,
  { url: "http://localhost:5173/", pretendToBeVisual: true, virtualConsole: vc, runScripts: "outside-only" },
);
const { window } = dom;

window.localStorage.setItem(
  "infarsight.auth",
  JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() / 1000 + tokens.expires_in,
    email,
  }),
);
// polyfills jsdom lacks (present in every real browser)
window.Element.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};

globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globalThis.CustomEvent = window.CustomEvent;
globalThis.Event = window.Event;
globalThis.MutationObserver = window.MutationObserver;

const assetDir = path.resolve("dist/assets");
const bundleFile = readdirSync(assetDir).find((f) => f.startsWith("index-") && f.endsWith(".js"));
if (!bundleFile) throw new Error("dist bundle missing — run npm run build first");
await import(path.join(assetDir, bundleFile));
console.log("• react bundle mounted in jsdom");

const body = () => document.body.innerHTML;
const waitFor = async (predicate, label, timeoutMs) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (predicate()) return true;
    await sleep(1500);
  }
  throw new Error(`TIMEOUT waiting for: ${label}`);
};

/* 1 — home dashboard renders */
await waitFor(() => body().includes("Where can Infarsight AI take your team next?"), "home hero", 20_000);
console.log("• PASS home dashboard rendered (hero + composer)");
await waitFor(() => body().includes("Sabre &amp; Amadeus GDS Live") || body().includes("GDS Live"), "health pill", 15_000);
console.log("• PASS backend health pill in topbar");

/* 2 — type a real prompt and send it through the React composer */
const ta = document.querySelector("textarea");
const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
setter.call(ta, "Cheapest business class flight from Mumbai to New York on 29 Oct 2026 for 2 adults");
ta.dispatchEvent(new window.Event("input", { bubbles: true }));
await sleep(300);
const genBtn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Generate Plan"));
genBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
console.log("• prompt submitted via composer — waiting for SSE stream…");

/* 3 — live streaming phase + flight cards */
await waitFor(() => body().includes("Searching flights") || body().includes("AI TRAVEL COPILOT"), "live stream UI", 60_000);
console.log("• PASS streaming assistant frame appeared");
await waitFor(() => body().includes("AI Optimal Route"), "featured flight card", 120_000);
console.log("• PASS featured flight card rendered from live GDS quotes");
await waitFor(() => body().includes("Select Flight"), "standard flight cards", 15_000);
console.log("• PASS alternative flight cards rendered");
await waitFor(() => body().includes("LLM Usage"), "sidebar usage meter", 20_000);
console.log("• PASS sidebar LLM usage meter populated");

/* 4 — open corporate checkout */
const bookBtn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Book");
bookBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
await waitFor(() => body().includes("Review &amp; Corporate Checkout"), "checkout screen", 10_000);
console.log("• PASS checkout screen rendered");
for (const needle of [
  "GDS Fare Lock Active",
  "Passenger Details &amp; Enterprise Profiles",
  "Corporate Travel Policy Compliant",
  "Amex Corporate Token",
  "Confirm &amp; Issue Electronic Ticket",
]) {
  if (!body().includes(needle)) throw new Error(`checkout missing: ${needle}`);
}
console.log("• PASS checkout sections: fare lock, passengers, compliance, payment, ticketing");

/* 5 — issue the ticket (simulated emission) */
const confirmBtn = [...document.querySelectorAll("button")].find((b) =>
  b.textContent.includes("Confirm &amp; Issue") || b.textContent.includes("Confirm & Issue"),
);
confirmBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
await waitFor(() => body().includes("Electronic ticket issued"), "ticket issued", 10_000);
console.log("• PASS ticket issuance flow completed");

console.log("\nSMOKE TEST: ALL CHECKS PASSED ✅");
process.exit(0);
