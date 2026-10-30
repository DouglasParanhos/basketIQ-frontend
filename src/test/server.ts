import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { consumption, emptyProfile, me, merchants, profile, receipt, summary } from "./fixtures";

export const API = "http://localhost:3000";

/** Default happy-path API; tests override per case with server.use(...). */
export const server = setupServer(
  http.get(`${API}/v1/config`, () => HttpResponse.json({ app_name: "Super Mercado" })),
  http.get(`${API}/v1/me`, () => HttpResponse.json(me)),
  http.get(`${API}/v1/me/profile`, () => HttpResponse.json(profile)),
  http.get(`${API}/v1/merchants`, () => HttpResponse.json(merchants)),
  http.get(`${API}/v1/receipts`, () => HttpResponse.json({ items: [{ id: "r1", status: "CONFIRMED", merchant: "LIDL", purchase_at: null, total_cents: 100, line_count: 1, overall_confidence: 1, needs_action: false, created_at: "2026-09-01T00:00:00Z" }], next_cursor: null })),
  http.get(`${API}/v1/receipts/:id`, () => HttpResponse.json(receipt())),
  http.get(`${API}/v1/analytics/summary`, () => HttpResponse.json(summary())),
  http.get(`${API}/v1/analytics/consumption`, () => HttpResponse.json(consumption())),
);

export function errorBody(code: string, message: string, extra: Record<string, unknown> = {}) {
  return { code, message, request_id: "req-1", ...extra };
}

/** Overrides GET /v1/config for one test. */
export function serveConfig(body: Record<string, unknown>) {
  server.use(http.get(`${API}/v1/config`, () => HttpResponse.json(body)));
}

/** Makes GET /v1/config fail with a 500 for one test. */
export function failConfig() {
  server.use(http.get(`${API}/v1/config`, () => HttpResponse.json(errorBody("internal_error", "x"), { status: 500 })));
}

/** The person's profile as the server has it (nothing saved unless told otherwise). */
export function serveProfile(saved = emptyProfile()) {
  server.use(http.get(`${API}/v1/me/profile`, () => HttpResponse.json(saved)));
}

/** PATCH /v1/me/profile: answers with the profile it produces and returns the list that collects the bodies it receives. */
export function servePatch() {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.patch(`${API}/v1/me/profile`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      const { onboarding_completed: _done, ...values } = body;
      return HttpResponse.json({ ...emptyProfile(), ...values, onboarding_completed_at: "2026-10-30T12:00:00Z" });
    }),
  );
  return bodies;
}
