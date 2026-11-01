import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { Schemas } from "../api/client";
import { consumption, emptyProfile, listArticles, me, merchants, monthTotals, overviewGreen, productAnalytics, productItem, profile, receipt, summary } from "./fixtures";

export const API = "http://localhost:3000";

/** Default happy-path API; tests override per case with server.use(...). */
export const server = setupServer(
  http.get(`${API}/v1/config`, () => HttpResponse.json({ app_name: "Super Mercado" })),
  http.get(`${API}/v1/me`, () => HttpResponse.json(me)),
  http.get(`${API}/v1/me/profile`, () => HttpResponse.json(profile)),
  http.get(`${API}/v1/merchants`, () => HttpResponse.json(merchants)),
  http.get(`${API}/v1/receipts/stored-files`, () => HttpResponse.json({ files: 9 })),
  http.delete(`${API}/v1/receipts/stored-files`, () => HttpResponse.json({ files_deleted: 9, receipts: 3, remaining: 0 })),
  http.get(`${API}/v1/receipts`, () => HttpResponse.json({ items: [{ id: "r1", status: "CONFIRMED", merchant: "LIDL", purchase_at: null, total_cents: 100, line_count: 1, overall_confidence: 1, needs_action: false, created_at: "2026-09-01T00:00:00Z" }], next_cursor: null })),
  http.get(`${API}/v1/receipts/:id`, () => HttpResponse.json(receipt())),
  http.get(`${API}/v1/analytics/summary`, () => HttpResponse.json(summary())),
  http.get(`${API}/v1/analytics/consumption`, () => HttpResponse.json(consumption())),
  http.get(`${API}/v1/analytics/overview`, () => HttpResponse.json(overviewGreen)),
  http.get(`${API}/v1/analytics/months`, () => HttpResponse.json(monthTotals)),
  http.get(`${API}/v1/products`, () => HttpResponse.json([productItem()])),
  http.get(`${API}/v1/products/:id/analytics`, () => HttpResponse.json(productAnalytics())),
  http.get(`${API}/v1/lists/articles`, () => HttpResponse.json(listArticles())),
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

/** GET /v1/receipts/stored-files for one test. */
export function serveStoredFiles(files: number) {
  server.use(http.get(`${API}/v1/receipts/stored-files`, () => HttpResponse.json({ files })));
}

/** DELETE /v1/receipts/stored-files: one answer per call (the last repeats); returns the call counter. */
export function serveStoredFilesDelete(answers: (Schemas["StoredFilesDeleted"] | "error")[]) {
  const calls = { count: 0 };
  server.use(
    http.delete(`${API}/v1/receipts/stored-files`, () => {
      const answer = answers[Math.min(calls.count, answers.length - 1)];
      calls.count += 1;
      return answer === "error" ? HttpResponse.json(errorBody("internal_error", "x"), { status: 500 }) : HttpResponse.json(answer);
    }),
  );
  return calls;
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

/**
 * GET /v1/analytics/overview for one test: a fixed answer, or one per month. Returns the months asked for, in order.
 * `delayMs` makes it slow (the loading state); "error" makes it fail with a 500.
 */
export function serveOverview(answer: Schemas["OverviewOut"] | ((month: string) => Schemas["OverviewOut"]) | "error", options: { delayMs?: number } = {}) {
  const months: string[] = [];
  server.use(
    http.get(`${API}/v1/analytics/overview`, async ({ request }) => {
      const month = new URL(request.url).searchParams.get("month") ?? "";
      months.push(month);
      if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      if (answer === "error") return HttpResponse.json(errorBody("internal_error", "x"), { status: 500 });
      return HttpResponse.json(typeof answer === "function" ? answer(month) : answer);
    }),
  );
  return months;
}

/** GET /v1/analytics/months for one test: the totals, or "error". */
export function serveMonths(answer: Schemas["MonthTotalOut"][] | "error") {
  server.use(http.get(`${API}/v1/analytics/months`, () => (answer === "error" ? HttpResponse.json(errorBody("internal_error", "x"), { status: 500 }) : HttpResponse.json(answer))));
}

/** The query of one GET /v1/receipts call. */
export interface ReceiptsCall {
  status: string[];
  cursor: string | null;
  limit: string | null;
}

/**
 * GET /v1/receipts for one test, in pages by cursor (the API orders by sending). Returns the calls made, in order.
 * `pages[0]` is the first page; the cursor of each next page is «p1», «p2»…
 */
export function serveReceipts(pages: Schemas["ReceiptSummaryOut"][][]) {
  const calls: ReceiptsCall[] = [];
  server.use(
    http.get(`${API}/v1/receipts`, ({ request }) => {
      const url = new URL(request.url);
      const cursor = url.searchParams.get("cursor");
      calls.push({ status: url.searchParams.getAll("status"), cursor, limit: url.searchParams.get("limit") });
      const index = cursor ? Number(cursor.slice(1)) : 0;
      return HttpResponse.json({ items: pages[index] ?? [], next_cursor: index + 1 < pages.length ? `p${index + 1}` : null });
    }),
  );
  return calls;
}
