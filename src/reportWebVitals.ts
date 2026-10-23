import type { Metric } from "web-vitals";

export type ReportHandler = (metric: Metric) => void;

/**
 * Reports Core Web Vitals (CLS, FCP, INP, LCP, TTFB) to the provided handler.
 * Wiring `reportWebVitals(console.log)` in `index.tsx` is enough to see them
 * during local development; in production send them to your analytics sink.
 */
export default function reportWebVitals(onPerfEntry?: ReportHandler): void {
  if (!onPerfEntry) return;

  void import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    onCLS(onPerfEntry);
    onFCP(onPerfEntry);
    onINP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  });
}
