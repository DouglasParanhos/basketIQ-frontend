import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { consumption, me, receipt, summary } from "./fixtures";

export const API = "http://localhost:3000";

/** Default happy-path API; tests override per case with server.use(...). */
export const server = setupServer(
  http.get(`${API}/v1/config`, () => HttpResponse.json({ app_name: "Super Mercado" })),
  http.get(`${API}/v1/me`, () => HttpResponse.json(me)),
  http.get(`${API}/v1/receipts`, () => HttpResponse.json({ items: [{ id: "r1", status: "CONFIRMED", merchant: "LIDL", purchase_at: null, total_cents: 100, line_count: 1, overall_confidence: 1, needs_action: false, created_at: "2026-09-01T00:00:00Z" }], next_cursor: null })),
  http.get(`${API}/v1/receipts/:id`, () => HttpResponse.json(receipt())),
  http.get(`${API}/v1/analytics/summary`, () => HttpResponse.json(summary())),
  http.get(`${API}/v1/analytics/consumption`, () => HttpResponse.json(consumption())),
);

export function errorBody(code: string, message: string, extra: Record<string, unknown> = {}) {
  return { code, message, request_id: "req-1", ...extra };
}
