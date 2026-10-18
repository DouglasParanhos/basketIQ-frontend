import type { Schemas } from "../api/client";

type Receipt = Schemas["ReceiptOut"];
type Line = Schemas["LineOut"];

export const me: Schemas["MeOut"] = {
  id: "u1",
  email: "maria@example.test",
  display_name: "Maria Silva",
  role: "user",
  privacy_accepted_at: "2026-10-01T10:00:00Z",
  privacy_version: "2026-10-15",
  current_privacy_version: "2026-10-15",
  created_at: "2026-10-01T10:00:00Z",
};

export function line(overrides: Partial<Line> = {}): Line {
  return {
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
    ...overrides,
  };
}

export function receipt(overrides: Partial<Receipt> = {}): Receipt {
  const lines = overrides.lines ?? [
    line(),
    line({
      id: "l2",
      line_number: 2,
      raw_description: "BANANA",
      product: { id: "p2", name: "BANANA" },
      quantity: "0.856",
      unit: "kg",
      unit_price_cents: 144,
      line_total_cents: 123,
      net_cents: 123,
      field_confidence: { description: 0.95, quantity: 0.6, unit_price: 0.6, line_total: 0.98 },
      flags: ["low_confidence:quantity", "low_confidence:unit_price"],
      review_status: "NEEDS_REVIEW",
      evidence: ["C BANANA 0,856 X 1,44 1,23"],
    }),
  ];
  return {
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
      printed_total_cents: 293,
      lines_total_cents: 293,
      discounts_cents: 0,
      recalculated_total_cents: 293,
      difference_cents: 0,
      reconciled: true,
    },
    overall_confidence: 0.6,
    field_confidence: { merchant: 0.99, purchase_at: 0.99, total: 0.98 },
    review_reasons: [
      { code: "low_confidence", message: "Valores lidos com pouca confiança.", field: null, line_index: 1, details: { fields: ["quantity"] } },
    ],
    quality_warnings: [],
    manually_edited_fields: [],
    lines,
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
    ...overrides,
  };
}

export function consumption(overrides: Partial<Schemas["ConsumptionOut"]> = {}): Schemas["ConsumptionOut"] {
  return {
    filters: { from: "2026-09-01", to: "2026-09-30", merchant: null, product_id: null },
    items: [
      {
        product_id: "p1",
        name: "LEITE MEIO GORDO",
        purchases: 3,
        units: "4",
        units_per_month: 4.1,
        spent_cents: 33500,
        avg_interval_days: 14,
        first_purchase: "2026-09-02",
        last_purchase: "2026-09-30",
      },
    ],
    empty: false,
    ...overrides,
  };
}

export function summary(overrides: Partial<Schemas["SummaryOut"]> = {}): Schemas["SummaryOut"] {
  return {
    filters: { from: "2026-09-01", to: "2026-09-30", merchant: null, product_id: null },
    cards: {
      total_spent_cents: 45500,
      purchases: 3,
      units: "6",
      articles: 5,
      variation_pct: { total_spent: 12.5, purchases: 50, units: null },
      previous_period: { from: "2026-08-02", to: "2026-08-31", total_spent_cents: 40444, purchases: 2, units: "3" },
    },
    series: {
      granularity: "day",
      points: [
        { period: "2026-09-02", spent_cents: 25000 },
        { period: "2026-09-20", spent_cents: 20500 },
      ],
      insufficient_data: false,
    },
    by_merchant: [
      { merchant: "PINGO_DOCE", spent_cents: 34000, purchases: 2, share_pct: 74.7 },
      { merchant: "LIDL", spent_cents: 11500, purchases: 1, share_pct: 25.3 },
    ],
    top_products_by_value: [{ product_id: "p1", name: "LEITE MEIO GORDO", spent_cents: 33500, units: "4", lines: 3 }],
    top_products_by_quantity: [{ product_id: "p1", name: "LEITE MEIO GORDO", spent_cents: 33500, units: "4", lines: 3 }],
    empty: false,
    ...overrides,
  };
}
