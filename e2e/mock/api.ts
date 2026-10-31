import type { Page, Route } from "@playwright/test";

/** In-memory fake of the BasketIQ API for UI tests (no backend). */
export interface FakeState {
  signedIn: boolean;
  consented: boolean;
  receipts: Record<string, unknown>[];
  empty: boolean;
  /** APP_NAME_FOR_CUSTOMER as served by GET /v1/config. */
  appName: string;
  /** SMART_LIST_ENABLED as served by GET /v1/config (off when absent). */
  smartList?: boolean;
  /** Whether the person already finished the onboarding (true when absent). */
  onboarded?: boolean;
  /** An account from before the onboarding: finished, with nothing answered (spec 014). */
  migrated?: boolean;
  /** The signed-in person is an operator. */
  admin?: boolean;
  /** Stored original files (3 per purchase), as GET /v1/receipts/stored-files counts them. Zero when absent. */
  storedFiles?: number;
  /** Calls received by DELETE /v1/receipts/stored-files. */
  storedFilesDeletes: number;
  /** Makes DELETE /v1/receipts/stored-files answer 500. */
  storedFilesFail?: boolean;
  /** Bodies received by PATCH /v1/me/profile, in order. */
  profilePatches: Record<string, unknown>[];
  /** Milliseconds GET /v1/me/profile waits before answering (to look at the loading state). */
  profileDelayMs?: number;
  /** What the upload endpoints received: the files in the order sent, and how many calls of each kind. */
  uploads: { inits: number; photos: number; stored: number; processed: number; names: string[]; hints: (string | null)[] };
  /** upload-init answers 409 duplicate_suspected unless allow_duplicate is true. */
  duplicate?: boolean;
  /** The presigned storage drops the connection (a network failure). */
  storageFails?: boolean;
  /** The state of GET /v1/analytics/overview (the green ring with a goal when absent). */
  overview?: OverviewKind;
  /** Milliseconds GET /v1/analytics/overview waits before answering (the loading state). */
  overviewDelayMs?: number;
  /** GET /v1/analytics/overview answers 500. */
  overviewFail?: boolean;
  /** The months GET /v1/analytics/overview was asked for, in order. */
  overviewRequests: string[];
}

export type OverviewKind = "green" | "orange" | "red" | "over" | "nogoal" | "fewdata" | "notrend" | "zero" | "empty";

/** Synthetic answers of GET /v1/analytics/overview (October 2026, a goal of 400 euros). */
function overviewBody(kind: OverviewKind, month: string) {
  const base = {
    month,
    spent_cents: 15200,
    goal_cents: 40000 as number | null,
    goal_pct: 38 as number | null,
    band: "ok" as string,
    monthly_average_cents: 31800 as number | null,
    recent_vs_average_pct: -7 as number | null,
    average_trend: "below" as string | null,
    average_months: 5,
    average_min_months: 2,
    purchases_this_month: 7,
    purchases_last_month: 11,
    weeks: [
      { index: 1, from: `${month}-01`, to: `${month}-07`, spent_cents: 1900 },
      { index: 2, from: `${month}-08`, to: `${month}-14`, spent_cents: 5800 },
      { index: 3, from: `${month}-15`, to: `${month}-21`, spent_cents: 3100 },
      { index: 4, from: `${month}-22`, to: `${month}-28`, spent_cents: 3200 },
      { index: 5, from: `${month}-29`, to: `${month}-31`, spent_cents: 1200 },
    ],
    by_merchant: [
      { merchant: "PINGO_DOCE", name: "Pingo Doce", spent_cents: 6200, purchases: 3, share_pct: 41 },
      { merchant: "LIDL", name: "Lidl", spent_cents: 5000, purchases: 2, share_pct: 33 },
      { merchant: "MERCADONA", name: "Mercadona", spent_cents: 4000, purchases: 2, share_pct: 26 },
    ],
    recent_receipts: [
      { id: "c1", merchant: null, name: "Outros", date: `${month}-29`, total_cents: null as number | null, status: "RECEIVED" },
      { id: "c2", merchant: null, name: "Outros", date: `${month}-28`, total_cents: null as number | null, status: "REVIEW_REQUIRED" },
      { id: "c3", merchant: "PINGO_DOCE", name: "Pingo Doce", date: `${month}-27`, total_cents: 4120 as number | null, status: "CONFIRMED" },
    ],
    empty: false,
  };
  const zero = { ...base, spent_cents: 0, goal_pct: 0, purchases_this_month: 0, weeks: base.weeks.map((w) => ({ ...w, spent_cents: 0 })), by_merchant: [], recent_receipts: [] };
  switch (kind) {
    case "orange":
      return { ...base, spent_cents: 24800, goal_pct: 62, band: "attention", recent_vs_average_pct: 2, average_trend: "on_average" };
    case "red":
      return { ...base, spent_cents: 35200, goal_pct: 88, band: "high", recent_vs_average_pct: 12, average_trend: "above" };
    case "over":
      return { ...base, spent_cents: 45200, goal_pct: 113, band: "high" };
    case "nogoal":
      return { ...base, spent_cents: 24800, goal_cents: null, goal_pct: null, band: "none" };
    case "fewdata":
      return { ...base, monthly_average_cents: null, recent_vs_average_pct: null, average_trend: null, average_months: 0 };
    case "notrend":
      return { ...base, recent_vs_average_pct: null, average_trend: null, average_months: 2 };
    case "zero":
      return zero;
    case "empty":
      return { ...zero, monthly_average_cents: null, recent_vs_average_pct: null, average_trend: null, average_months: 0, purchases_last_month: 0, empty: true };
    default:
      return base;
  }
}

const MERCHANTS = [
  { id: "CONTINENTE", name: "Continente" },
  { id: "PINGO_DOCE", name: "Pingo Doce" },
  { id: "LIDL", name: "Lidl" },
  { id: "AUCHAN", name: "Auchan" },
  { id: "ALDI", name: "Aldi" },
  { id: "MERCADONA", name: "Mercadona" },
  { id: "EL_CORTE_INGLES", name: "El Corte Inglés" },
];

const emptyProfile = { household_size: null, merchants: [], goals: [], monthly_goal_cents: null, onboarding_completed_at: null };
const doneProfile = { household_size: 2, merchants: ["LIDL"], goals: ["finances"], monthly_goal_cents: 30000, onboarding_completed_at: "2026-10-02T10:00:00Z" };

const me = (s: FakeState) => ({
  id: "u1",
  email: "maria@example.test",
  display_name: "Maria Silva",
  role: s.admin ? "admin" : "user",
  privacy_accepted_at: s.consented ? "2026-10-01T10:00:00Z" : null,
  privacy_version: s.consented ? "2026-10-15" : null,
  current_privacy_version: "2026-10-15",
  created_at: "2026-10-01T10:00:00Z",
});

export const reviewReceipt = {
  id: "r1",
  status: "REVIEW_REQUIRED",
  error: null,
  merchant: "PINGO_DOCE",
  merchant_hint: null,
  purchase_at: "2026-09-15T12:30:00+01:00",
  receipt_ref: "FS 0001/0001",
  currency: "EUR",
  source_type: "IMAGE",
  totals: {
    subtotal_cents: null,
    tax_cents: null,
    printed_total_cents: 313,
    lines_total_cents: 293,
    discounts_cents: 0,
    recalculated_total_cents: 293,
    difference_cents: -20,
    reconciled: false,
  },
  overall_confidence: 0.6,
  field_confidence: { merchant: 0.99, purchase_at: 0.99, total: 0.98 },
  review_reasons: [
    { code: "totals_mismatch", message: "A soma das linhas não coincide com o total da nota.", field: "total", line_index: null, details: { difference_cents: -20 } },
    { code: "low_confidence", message: "Valores lidos com pouca confiança.", field: null, line_index: 1, details: {} },
  ],
  quality_warnings: [{ code: "blurry", message: "A imagem parece desfocada." }],
  manually_edited_fields: [],
  lines: [
    {
      id: "l1",
      line_number: 1,
      raw_description: "LEITE MEIO GORDO",
      product: { id: "p1", name: "LEITE MEIO GORDO" },
      quantity: "2.000",
      unit: "un",
      unit_price_cents: 85,
      line_total_cents: 170,
      discount_cents: 0,
      net_cents: 170,
      tax_code: "C",
      confidence: 0.92,
      field_confidence: { description: 0.95, quantity: 0.98, unit_price: 0.98, line_total: 0.98 },
      review_status: "OK",
      flags: [],
      unresolved: false,
      manually_edited: false,
      edited_fields: [],
      evidence: ["C LEITE MEIO GORDO 2 X 0,85 1,70"],
    },
    {
      id: "l2",
      line_number: 2,
      raw_description: "BANANA",
      product: { id: "p2", name: "BANANA" },
      quantity: "0.856",
      unit: "kg",
      unit_price_cents: 144,
      line_total_cents: 123,
      discount_cents: 0,
      net_cents: 123,
      tax_code: "C",
      confidence: 0.6,
      field_confidence: { description: 0.95, quantity: 0.6, unit_price: 0.6, line_total: 0.98 },
      review_status: "NEEDS_REVIEW",
      flags: ["low_confidence:quantity", "low_confidence:unit_price"],
      unresolved: false,
      manually_edited: false,
      edited_fields: [],
      evidence: ["C BANANA 0,856 X 1,44 1,23"],
    },
  ],
  duplicate_of_receipt_id: null,
  duplicate_acknowledged: false,
  can_confirm: true,
  confirmed_at: null,
  confirmed_by: null,
  original_available: true,
  original_expires_at: null,
  original_deleted_at: null,
  processing: { job_id: "j1", status: "SUCCEEDED", route: "LOCAL_OCR", attempts: 1 },
  version: 3,
  created_at: "2026-09-15T12:40:00Z",
  updated_at: "2026-09-15T12:41:00Z",
};

const summary = {
  filters: { from: "2026-10-01", to: "2026-10-31", merchant: null, product_id: null },
  cards: {
    total_spent_cents: 45500,
    purchases: 3,
    units: "6",
    articles: 5,
    variation_pct: { total_spent: 12.5, purchases: 50, units: null },
    previous_period: { from: "2026-09-01", to: "2026-09-30", total_spent_cents: 40444, purchases: 2, units: "3" },
  },
  series: {
    granularity: "day",
    points: Array.from({ length: 31 }, (_, i) => ({ period: `2026-10-${String(i + 1).padStart(2, "0")}`, spent_cents: i % 6 === 0 ? 4000 + i * 300 : 0 })),
    insufficient_data: false,
  },
  by_merchant: [
    { merchant: "PINGO_DOCE", spent_cents: 34000, purchases: 2, share_pct: 74.7 },
    { merchant: "LIDL", spent_cents: 11500, purchases: 1, share_pct: 25.3 },
  ],
  top_products_by_value: [
    { product_id: "p1", name: "LEITE MEIO GORDO", spent_cents: 33500, units: "4", lines: 3 },
    { product_id: null, name: "Produto não identificado", spent_cents: 900, units: "1", lines: 1 },
  ],
  top_products_by_quantity: [{ product_id: "p1", name: "LEITE MEIO GORDO", spent_cents: 33500, units: "4", lines: 3 }],
  empty: false,
};

export async function fakeApi(page: Page, overrides: Partial<FakeState> = {}): Promise<FakeState> {
  const state: FakeState = {
    signedIn: true,
    consented: true,
    receipts: [reviewReceipt],
    empty: false,
    appName: "Super Mercado",
    profilePatches: [],
    storedFilesDeletes: 0,
    uploads: { inits: 0, photos: 0, stored: 0, processed: 0, names: [], hints: [] },
    overviewRequests: [],
    ...overrides,
  };
  let purchasesWithFiles = Math.ceil((state.storedFiles ?? 0) / 3);
  let profile: Record<string, unknown> = state.migrated
    ? { ...emptyProfile, onboarding_completed_at: "2026-10-31T00:00:00Z" }
    : state.onboarded === false ? { ...emptyProfile } : { ...doneProfile };
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  const unauth = (route: Route) => json(route, { code: "unauthenticated", message: "Sessão necessária.", request_id: "r" }, 401);

  // The presigned storage is another origin: it answers the upload (CORS allowed) or drops the connection.
  await page.route("http://storage.test/**", (route) => {
    const cors = { "access-control-allow-origin": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...cors, "access-control-allow-methods": "POST" } });
    if (state.storageFails) return route.abort("failed");
    state.uploads.stored += 1;
    return route.fulfill({ status: 204, headers: cors });
  });

  await page.route("**/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    // Public configuration: available without a session (the login screen needs it).
    if (path === "/v1/config") return json(route, { app_name: state.appName, smart_list_enabled: state.smartList });
    if (path === "/v1/config/manifest.webmanifest") {
      return route.fulfill({
        contentType: "application/manifest+json",
        body: JSON.stringify({ name: state.appName, short_name: state.appName, start_url: "/", display: "standalone" }),
      });
    }
    if (!state.signedIn && !path.startsWith("/v1/auth/")) return unauth(route);
    if (path === "/v1/auth/refresh") return unauth(route);
    if (path === "/v1/me" && method === "GET") return json(route, me(state));
    if (path === "/v1/me/privacy-consent") {
      state.consented = true;
      return json(route, me(state));
    }
    if (path === "/v1/me/profile" && method === "GET") {
      if (state.profileDelayMs) await new Promise((resolve) => setTimeout(resolve, state.profileDelayMs));
      return json(route, profile);
    }
    if (path === "/v1/me/profile" && method === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      state.profilePatches.push(body);
      const { onboarding_completed: _done, ...values } = body;
      profile = { ...profile, ...values, onboarding_completed_at: profile.onboarding_completed_at ?? "2026-10-30T12:00:00Z" };
      return json(route, profile);
    }
    if (path === "/v1/merchants") return json(route, MERCHANTS);
    if (path === "/v1/receipts/stored-files" && method === "GET") return json(route, { files: state.storedFiles ?? 0 });
    if (path === "/v1/receipts/stored-files" && method === "DELETE") {
      state.storedFilesDeletes += 1;
      if (state.storedFilesFail) return json(route, { code: "internal_error", message: "Erro.", request_id: "r" }, 500);
      const batch = Math.min(500, purchasesWithFiles);
      purchasesWithFiles -= batch;
      const removed = Math.min(batch * 3, state.storedFiles ?? 0);
      state.storedFiles = (state.storedFiles ?? 0) - removed;
      return json(route, { files_deleted: removed, receipts: batch, remaining: purchasesWithFiles });
    }
    if (path === "/v1/me" && method === "DELETE") {
      state.signedIn = false;
      return json(route, { receipts_deleted: 1, objects_deleted: 1 });
    }
    if (path === "/v1/receipts" && method === "GET") {
      const items = state.empty ? [] : state.receipts.map((r) => ({ id: r.id, status: r.status, merchant: r.merchant, purchase_at: r.purchase_at, total_cents: 313, line_count: 2, overall_confidence: 0.6, needs_action: true, created_at: r.created_at }));
      return json(route, { items, next_cursor: null });
    }
    if (path === "/v1/analytics/overview" && method === "GET") {
      const month = url.searchParams.get("month") ?? "";
      state.overviewRequests.push(month);
      if (state.overviewDelayMs) await new Promise((resolve) => setTimeout(resolve, state.overviewDelayMs));
      if (state.overviewFail) return json(route, { code: "internal_error", message: "Erro.", request_id: "r" }, 500);
      return json(route, overviewBody(state.overview ?? "green", month));
    }
    if (path === "/v1/receipts/upload-init" && method === "POST") {
      const body = route.request().postDataJSON() as { filename: string; allow_duplicate: boolean; merchant_hint: string | null };
      if (state.duplicate && !body.allow_duplicate) {
        return json(
          route,
          { code: "duplicate_suspected", message: "Este documento parece já ter sido importado.", request_id: "r", details: { duplicate_of: { receipt_id: "r1", merchant: "LIDL", purchase_at: "2026-09-12T10:15:00+01:00", total_cents: 905 } } },
          409,
        );
      }
      state.uploads.inits += 1;
      state.uploads.names.push(body.filename);
      state.uploads.hints.push(body.merchant_hint);
      return json(
        route,
        { receipt_id: "r1", upload: { url: "http://storage.test/p0", fields: {}, expires_at: "2030-01-01T00:00:00Z" }, requirements: { max_bytes: 15728640, accepted_types: [], max_pdf_pages: 5, max_photos: 6 } },
        201,
      );
    }
    if (path === "/v1/receipts/r1/photos" && method === "POST") {
      state.uploads.photos += 1;
      state.uploads.names.push((route.request().postDataJSON() as { filename: string }).filename);
      return json(route, { url: `http://storage.test/p${state.uploads.photos}`, fields: {}, expires_at: "2030-01-01T00:00:00Z" }, 201);
    }
    if (path === "/v1/receipts/r1/upload-url" && method === "POST") return json(route, { url: "http://storage.test/retry", fields: {}, expires_at: "2030-01-01T00:00:00Z" });
    if (path === "/v1/receipts/r1/process" && method === "POST") {
      state.uploads.processed += 1;
      return json(route, { id: "j1", status: "QUEUED", attempt_count: 0, processing_route: null, created_at: "2026-10-31T10:00:00Z" }, 202);
    }
    if (path === "/v1/receipts/r1" && method === "GET") return json(route, reviewReceipt);
    if (path === "/v1/analytics/summary") return json(route, summary);
    if (path === "/v1/analytics/consumption") {
      return json(route, { filters: summary.filters, items: [{ product_id: "p1", name: "LEITE MEIO GORDO", purchases: 3, units: "4", units_per_month: 4.1, spent_cents: 33500, avg_interval_days: 14, first_purchase: "2026-10-02", last_purchase: "2026-10-30" }], empty: false });
    }
    if (path === "/v1/products") return json(route, [{ id: "p1", name: "LEITE MEIO GORDO", unit_type: "un", lines: 3, spent_cents: 33500, last_purchase_at: "2026-10-20T10:00:00Z" }]);
    return json(route, { code: "not_found", message: "Não encontrado.", request_id: "r" }, 404);
  });
  return state;
}
