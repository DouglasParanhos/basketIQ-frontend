import type { Page, Route } from "@playwright/test";

/** In-memory fake of the BasketIQ API for UI tests (no backend). */
export interface FakeState {
  signedIn: boolean;
  consented: boolean;
  receipts: Record<string, unknown>[];
  empty: boolean;
  /** APP_NAME_FOR_CUSTOMER as served by GET /v1/config. */
  appName: string;
}

const me = (s: FakeState) => ({
  id: "u1",
  email: "maria@example.test",
  display_name: "Maria Silva",
  role: "user",
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
    ...overrides,
  };
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  const unauth = (route: Route) => json(route, { code: "unauthenticated", message: "Sessão necessária.", request_id: "r" }, 401);

  await page.route("**/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    // Public configuration: available without a session (the login screen needs it).
    if (path === "/v1/config") return json(route, { app_name: state.appName });
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
    if (path === "/v1/receipts" && method === "GET") {
      const items = state.empty ? [] : state.receipts.map((r) => ({ id: r.id, status: r.status, merchant: r.merchant, purchase_at: r.purchase_at, total_cents: 313, line_count: 2, overall_confidence: 0.6, needs_action: true, created_at: r.created_at }));
      return json(route, { items, next_cursor: null });
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
