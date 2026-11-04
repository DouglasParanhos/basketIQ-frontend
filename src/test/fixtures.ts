import type { Schemas } from "../api/client";

type Receipt = Schemas["ReceiptOut"];
type Line = Schemas["LineOut"];

export const me: Schemas["MeOut"] = {
  id: "u1",
  email: "maria@example.test",
  display_name: "Maria Silva",
  role: "user",
  privacy_accepted_at: "2026-10-01T10:00:00Z",
  privacy_version: "2026-11-04",
  current_privacy_version: "2026-11-04",
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
    store_label: "ESTRADA DA LUZ",
    merchant_name: null,
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
    photo_count: 1,
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

/** A finished onboarding: what the server returns once the person has been through it. */
export const profile: Schemas["ProfileOut"] = {
  household_size: 2,
  merchants: ["LIDL"],
  goals: ["finances"],
  monthly_goal_cents: 30000,
  onboarding_completed_at: "2026-10-02T10:00:00Z",
  passkey_offer_dismissed_at: null,
};

/** A new account: nothing saved yet. */
export function emptyProfile(overrides: Partial<Schemas["ProfileOut"]> = {}): Schemas["ProfileOut"] {
  return { household_size: null, merchants: [], goals: [], monthly_goal_cents: null, onboarding_completed_at: null, passkey_offer_dismissed_at: null, ...overrides };
}

/** An account from before the onboarding: finished and empty (what the backend migration leaves). */
export const migratedProfile = emptyProfile({ onboarding_completed_at: "2026-10-31T00:00:00Z" });

/** The signed-in operator. */
export const adminMe: Schemas["MeOut"] = { ...me, role: "admin" };

/** The seven supported merchants, as GET /v1/merchants serves them. */
export const merchants: Schemas["MerchantOut"][] = [
  { id: "CONTINENTE", name: "Continente" },
  { id: "PINGO_DOCE", name: "Pingo Doce" },
  { id: "LIDL", name: "Lidl" },
  { id: "AUCHAN", name: "Auchan" },
  { id: "ALDI", name: "Aldi" },
  { id: "MERCADONA", name: "Mercadona" },
  { id: "EL_CORTE_INGLES", name: "El Corte Inglés" },
];

// ---------------------------------------------------------------- Início (spec 011): GET /v1/analytics/overview, synthetic

type Overview = Schemas["OverviewOut"];

/** October 2026, a goal of 400 €, 152 € spent (38 %, green), an average that is 7 % below, one purchase of each state. */
export const overviewGreen: Overview = {
  month: "2026-10",
  spent_cents: 15200,
  goal_cents: 40000,
  goal_pct: 38,
  band: "ok",
  monthly_average_cents: 31800,
  recent_vs_average_pct: -7,
  average_trend: "below",
  average_months: 5,
  average_min_months: 2,
  purchases_this_month: 7,
  purchases_last_month: 11,
  weeks: [
    { index: 1, from: "2026-10-01", to: "2026-10-07", spent_cents: 1900 },
    { index: 2, from: "2026-10-08", to: "2026-10-14", spent_cents: 5800 },
    { index: 3, from: "2026-10-15", to: "2026-10-21", spent_cents: 3100 },
    { index: 4, from: "2026-10-22", to: "2026-10-28", spent_cents: 3200 },
    { index: 5, from: "2026-10-29", to: "2026-10-31", spent_cents: 1200 },
  ],
  by_merchant: [
    { merchant: "PINGO_DOCE", name: "Pingo Doce", spent_cents: 6200, purchases: 3, share_pct: 41 },
    { merchant: "LIDL", name: "Lidl", spent_cents: 5000, purchases: 2, share_pct: 33 },
    { merchant: "MERCADONA", name: "Mercadona", spent_cents: 4000, purchases: 2, share_pct: 26 },
  ],
  recent_receipts: [
    { id: "c1", merchant: null, name: "Outros", date: "2026-10-29", total_cents: null, status: "RECEIVED" },
    { id: "c2", merchant: null, name: "Outros", date: "2026-10-28", total_cents: null, status: "REVIEW_REQUIRED" },
    { id: "c3", merchant: "PINGO_DOCE", name: "Pingo Doce", date: "2026-10-27", total_cents: 4120, status: "CONFIRMED" },
  ],
  empty: false,
};

/** The same month with Continente and Auchan side by side (they share a red): 38 %, 24 %, 22 % and 16 % of 152 €. */
export const overviewTwoReds: Overview = {
  ...overviewGreen,
  by_merchant: [
    { merchant: "CONTINENTE", name: "Continente", spent_cents: 5776, purchases: 3, share_pct: 38 },
    { merchant: "AUCHAN", name: "Auchan", spent_cents: 3648, purchases: 2, share_pct: 24 },
    { merchant: "PINGO_DOCE", name: "Pingo Doce", spent_cents: 3344, purchases: 1, share_pct: 22 },
    { merchant: "LIDL", name: "Lidl", spent_cents: 2432, purchases: 1, share_pct: 16 },
  ],
  recent_receipts: [
    { id: "d1", merchant: "CONTINENTE", name: "Continente", date: "2026-10-29", total_cents: 5776, status: "CONFIRMED" },
    { id: "d2", merchant: "AUCHAN", name: "Auchan", date: "2026-10-28", total_cents: 3648, status: "CONFIRMED" },
  ],
};

/** 248 € of 400 € (62 %, orange), average on target. */
export const overviewOrange: Overview = { ...overviewGreen, spent_cents: 24800, goal_pct: 62, band: "attention", recent_vs_average_pct: 2, average_trend: "on_average" };
/** 352 € of 400 € (88 %, red), average 12 % above. */
export const overviewRed: Overview = { ...overviewGreen, spent_cents: 35200, goal_pct: 88, band: "high", recent_vs_average_pct: 12, average_trend: "above" };
/** 452 € of 400 € (113 %, red, above the goal). */
export const overviewOver: Overview = { ...overviewGreen, spent_cents: 45200, goal_pct: 113, band: "high" };
/** No goal defined (also an account from before the onboarding). */
export const overviewNoGoal: Overview = { ...overviewGreen, spent_cents: 24800, goal_cents: null, goal_pct: null, band: "none" };
/** Less than the minimum months: no average and no trend yet. */
export const overviewFewData: Overview = { ...overviewGreen, monthly_average_cents: null, recent_vs_average_pct: null, average_trend: null, average_months: 0 };
/** Two months: an average but still no trend (the backend needs a third month for it). */
export const overviewNoTrend: Overview = { ...overviewGreen, recent_vs_average_pct: null, average_trend: null, average_months: 2 };
/** A month with no confirmed purchase, in an account that has some elsewhere: zeros, with the goal. */
export const overviewZeroMonth: Overview = {
  ...overviewGreen,
  spent_cents: 0,
  goal_pct: 0,
  band: "ok",
  purchases_this_month: 0,
  weeks: overviewGreen.weeks.map((w) => ({ ...w, spent_cents: 0 })),
  by_merchant: [],
  recent_receipts: [],
};
/** An account with no confirmed purchase in any month. */
export const overviewEmpty: Overview = {
  ...overviewZeroMonth,
  monthly_average_cents: null,
  recent_vs_average_pct: null,
  average_trend: null,
  average_months: 0,
  purchases_last_month: 0,
  empty: true,
};

/** Spending against a 400 € goal as the backend 014 rounds it: percentage half up, band from the rounded percentage (50 and 75 inclusive). */
export function overviewFor(spentCents: number, goalCents = 40000): Overview {
  const pct = Math.floor((spentCents * 100) / goalCents + 0.5);
  return { ...overviewGreen, spent_cents: spentCents, goal_cents: goalCents, goal_pct: pct, band: pct <= 50 ? "ok" : pct <= 75 ? "attention" : "high" };
}

// ---------------------------------------------------------------- Talões (spec 012): months, receipts and products, synthetic

/** GET /v1/analytics/months: confirmed purchases and spending per month, newest first. */
export const monthTotals: Schemas["MonthTotalOut"][] = [
  { month: "2026-10", confirmed_count: 7, total_cents: 24800 },
  { month: "2026-09", confirmed_count: 5, total_cents: 32200 },
  { month: "2025-12", confirmed_count: 2, total_cents: 5000 },
];

/** One line of GET /v1/receipts: confirmed, from a Lidl, by default. */
export function receiptItem(overrides: Partial<Schemas["ReceiptSummaryOut"]> = {}): Schemas["ReceiptSummaryOut"] {
  return {
    id: "r1",
    status: "CONFIRMED",
    merchant: "LIDL",
    merchant_name: null,
    store_label: null,
    purchase_at: "2026-10-24T10:00:00Z",
    total_cents: 2895,
    line_count: 9,
    overall_confidence: 1,
    needs_action: false,
    created_at: "2026-10-24T12:00:00Z",
    ...overrides,
  };
}

/** One line of GET /v1/products, with the average price and the counts. */
export function productItem(overrides: Partial<Schemas["ProductSearchItem"]> = {}): Schemas["ProductSearchItem"] {
  return {
    id: "p1",
    name: "Peito de frango",
    unit_type: "kg",
    lines: 4,
    spent_cents: 2650,
    last_purchase_at: "2026-10-27T10:00:00Z",
    avg_price_cents: 552,
    price_basis: "kg",
    purchases: 4,
    merchants: 3,
    ...overrides,
  };
}

/** GET /v1/products/{id}/analytics: three merchants (in the code order the API gives), four purchases. */
export function productAnalytics(overrides: Partial<Schemas["ProductAnalyticsOut"]> = {}): Schemas["ProductAnalyticsOut"] {
  const point = (id: string, date: string, merchant: string, unitCents: number, quantity: string, raw: string): Schemas["PricePoint"] => ({
    receipt_id: id,
    date,
    merchant,
    quantity,
    unit: "kg",
    unit_price_cents: unitCents,
    price_basis: "kg",
    net_cents: Math.round(unitCents * Number(quantity)),
    raw_description: raw,
  });
  return {
    product: { id: "p1", name: "Peito de frango", unit_type: "kg" },
    price_basis: "kg",
    mixed_units: false,
    total_quantity: "4.8",
    total_spent_cents: 2650,
    avg_price_cents: 552,
    min_price_cents: 499,
    max_price_cents: 589,
    purchases: 4,
    insufficient_data: false,
    history: [
      point("a", "2026-06-10", "PINGO_DOCE", 589, "1.2", "PEITO FRANGO 1KG"),
      point("b", "2026-08-12", "LIDL", 499, "1.1", "FRANGO PEITO"),
      point("c", "2026-09-20", "MERCADONA", 579, "1.3", "PEITO DE FRANGO"),
      point("d", "2026-10-15", "PINGO_DOCE", 549, "1.2", "PEITO FRANGO"),
    ],
    by_merchant: [
      { merchant: "LIDL", purchases: 1, avg_price_cents: 499, min_price_cents: 499, max_price_cents: 499, last_price_cents: 499, last_date: "2026-08-12" },
      { merchant: "MERCADONA", purchases: 1, avg_price_cents: 579, min_price_cents: 579, max_price_cents: 579, last_price_cents: 579, last_date: "2026-09-20" },
      { merchant: "PINGO_DOCE", purchases: 2, avg_price_cents: 569, min_price_cents: 549, max_price_cents: 589, last_price_cents: 549, last_date: "2026-10-15" },
    ],
    ...overrides,
  };
}

/** GET /v1/lists/articles: a counted item in two stores (one purchase with a discount) and a weighed one. */
export function listArticles(overrides: Partial<Schemas["ListArticlesOut"]> = {}): Schemas["ListArticlesOut"] {
  const price = (price_cents: number, date: string, discounted = false): Schemas["ArticlePrice"] => ({ price_cents, date, discounted });
  return {
    window_days: 90,
    date_from: "2026-08-18",
    date_to: "2026-11-15",
    excluded_lines: 0,
    items: [
      {
        product_id: "p2",
        name: "Iogurte grego",
        purchases: 4,
        packages: "5",
        packages_per_month: 1.7,
        avg_interval_days: 24.3,
        spent_cents: 795,
        price_basis: "un",
        mixed_units: false,
        avg_price_cents: 159,
        last_purchase: "2026-11-01",
        articles: [
          {
            merchant: "LIDL",
            merchant_name: "Lidl",
            purchases: 3,
            avg_price_cents: 149,
            lowest: price(125, "2026-09-10", true),
            highest: price(161, "2026-10-20"),
            last: price(161, "2026-10-20"),
          },
          {
            merchant: "PINGO_DOCE",
            merchant_name: "Pingo Doce",
            purchases: 1,
            avg_price_cents: 199,
            lowest: price(199, "2026-11-01"),
            highest: price(199, "2026-11-01"),
            last: price(199, "2026-11-01"),
          },
        ],
      },
      {
        product_id: "p1",
        name: "Peito de frango",
        purchases: 2,
        packages: "2",
        packages_per_month: 0.7,
        avg_interval_days: 14,
        spent_cents: 850,
        price_basis: "kg",
        mixed_units: false,
        avg_price_cents: 567,
        last_purchase: "2026-09-15",
        articles: [
          {
            merchant: null,
            merchant_name: "Talho Central",
            purchases: 2,
            avg_price_cents: 567,
            lowest: price(550, "2026-09-15"),
            highest: price(600, "2026-09-01"),
            last: price(550, "2026-09-15"),
          },
        ],
      },
    ],
    ...overrides,
  };
}
