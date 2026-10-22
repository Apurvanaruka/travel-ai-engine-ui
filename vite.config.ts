import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The FastAPI backend ships `access-control-allow-origin: *`, so the browser
// can call it directly (no dev proxy needed). Override the target with
// VITE_BACKEND_URL in .env when pointing at another environment.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
