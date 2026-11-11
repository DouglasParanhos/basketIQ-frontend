import { describe, expect, it } from "vitest";
import { lisbonIso, lisbonParts, splitLine, toDraft, toPatch, setField } from "../features/receipts/draft";
import { line } from "../test/fixtures";
import {
  centsToInput,
  formatAmount,
  formatCents,
  formatPercent,
  formatPurchasesAgainst,
  formatQuantity,
  formatVariationAgainst,
  formatWholeEuros,
  NBSP,
  NO_AMOUNT,
  parseEurToCents,
  parseQuantity,
} from "./format";
import { describePeriod, periodFor, shiftPeriod } from "./period";
import { effectiveType, validateFile } from "./upload";

describe("money (PT-7)", () => {
  it.each([
    ["3,49", 349],
    ["3.49", 349],
    ["1.234,56", 123456],
    ["12", 1200],
    ["0,5", 50],
    ["-0,50", -50],
    ["abc", null],
    ["", null],
  ])("parses %s", (input, cents) => expect(parseEurToCents(input)).toBe(cents));

  it("round-trips without floating point drift", () => {
    for (const cents of [1, 10, 99, 100, 101, 1999, 123456]) expect(parseEurToCents(centsToInput(cents))).toBe(cents);
    expect(formatAmount(349)).toBe("3,49");
  });

  it("formats and parses quantities with a comma", () => {
    expect(formatQuantity("0.513", "kg")).toBe("0,513 kg");
    expect(formatQuantity("2.000", "un")).toBe("2");
    expect(parseQuantity("0,456")).toBe("0.456");
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("1,2345")).toBeNull();
  });
});

describe("whole euros (F-113)", () => {
  it("F-113: shows whole euros without decimals, in pt-PT", () => {
    const plain = (euros: number) => formatWholeEuros(euros).replace(/\s/g, " ");
    expect(plain(300)).toBe("300 €");
    expect(plain(50)).toBe("50 €");
    expect(plain(800)).toBe("800 €");
  });
});

describe("percentages and amounts: the space before «%» and «€» does not break the line", () => {
  it("«38 %» has U+00A0 between the figure and the sign, the same as the «€» of Intl", () => {
    expect(NBSP.charCodeAt(0)).toBe(160); // U+00A0, the one Intl puts before «€»
    expect(formatCents(100).charCodeAt(4)).toBe(160);
    expect(formatPercent(38)).toBe(`38${NBSP}%`);
    expect(formatPercent(12.5)).toBe(`12,5${NBSP}%`);
    expect(formatCents(2275)).toBe(`22,75${NBSP}€`);
  });

  it("a variation says the direction in words, with one decimal at most", () => {
    expect(formatVariationAgainst(-23, "setembro de 2026")).toBe(`23${NBSP}% abaixo de setembro de 2026`);
    expect(formatVariationAgainst(7.25, "setembro")).toBe(`7,3${NBSP}% acima de setembro`);
    expect(formatVariationAgainst(0, "setembro")).toBe("igual a setembro");
    expect(formatVariationAgainst(-0.04, "setembro")).toBe("igual a setembro"); // rounds to zero: no «0 % abaixo»
    expect(formatVariationAgainst(null, "setembro")).toBeNull();
  });

  it("the purchases behind a variation say the difference in words, in the right number", () => {
    expect(formatPurchasesAgainst(5, 3)).toBe("2 compras a mais");
    expect(formatPurchasesAgainst(3, 2)).toBe("1 compra a mais");
    expect(formatPurchasesAgainst(1, 4)).toBe("3 compras a menos");
    expect(formatPurchasesAgainst(2, 3)).toBe("1 compra a menos");
    expect(formatPurchasesAgainst(4, 4)).toBe("o mesmo número de compras");
  });

  it("the figure of an unknown amount is the same «— €»", () => {
    expect(NO_AMOUNT).toBe(`—${NBSP}€`);
  });
});

describe("periods (F-18)", () => {
  it("builds month, quarter and year ranges", () => {
    expect(periodFor("month", { y: 2026, m0: 1 })).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodFor("quarter", { y: 2026, m0: 7 })).toMatchObject({ from: "2026-07-01", to: "2026-09-30" });
    expect(periodFor("year", { y: 2026, m0: 0 })).toMatchObject({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("moves across year boundaries", () => {
    expect(shiftPeriod(periodFor("month", { y: 2026, m0: 0 }), -1)).toMatchObject({ from: "2025-12-01", to: "2025-12-31" });
    expect(shiftPeriod(periodFor("quarter", { y: 2026, m0: 10 }), 1)).toMatchObject({ from: "2027-01-01", to: "2027-03-31" });
    expect(describePeriod(periodFor("quarter", { y: 2026, m0: 4 }))).toBe("2.º trimestre de 2026");
  });
});

describe("file validation (F-08, RF-04)", () => {
  const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
  it("accepts the supported types", () => {
    expect(validateFile(file("a.pdf", "application/pdf"))).toBeNull();
    expect(validateFile(file("a.png", "image/png"))).toBeNull();
    expect(validateFile(file("IMG_1.HEIC", ""))).toBeNull(); // browsers often omit the HEIC type
    expect(effectiveType(file("IMG_1.HEIC", ""))).toBe("image/heic");
  });
  it("rejects other types, empty and oversized files", () => {
    expect(validateFile(file("a.exe", "application/x-msdownload"))).toMatch(/não é suportado/);
    expect(validateFile(file("a.pdf", "application/pdf", 0))).toMatch(/vazio/);
    expect(validateFile(file("a.pdf", "application/pdf", 16 * 1024 * 1024))).toMatch(/15 MB/);
  });
});

describe("review draft (RF-07)", () => {
  it("sends only the fields the person changed, and the total that the quantity works out", () => {
    const draft = setField(toDraft(line()), "quantity", "3");
    expect(toPatch(draft)).toEqual({ id: "l1", quantity: "3", line_total_cents: 255 });
    expect(toPatch(toDraft(line()))).toEqual({ id: "l1" });
  });

  it("sends a new product name as a correction, keeping the original description", () => {
    const draft = setField(toDraft(line()), "product", "Leite meio-gordo");
    expect(toPatch(draft)).toEqual({ id: "l1", product_name: "Leite meio-gordo" });
  });

  it("splits integer quantities between two lines", () => {
    const [a, b] = splitLine(toDraft(line({ quantity: "3.000", unit_price_cents: 85, line_total_cents: 255 })));
    expect([a.quantity, a.line_total, b.quantity, b.line_total]).toEqual(["2", "1,70", "1", "0,85"]);
    expect(a.id).toBe("l1");
    expect(b.id).toBeUndefined();
  });

  it("splits weighed lines by halving the total", () => {
    const [a, b] = splitLine(toDraft(line({ quantity: "0.856", unit: "kg", line_total_cents: 123 })));
    expect([a.line_total, b.line_total]).toEqual(["0,62", "0,61"]);
  });

  it("uses Lisbon time for purchase dates across DST", () => {
    expect(lisbonIso("2026-07-01", "23:30")).toBe("2026-07-01T23:30:00+01:00");
    expect(lisbonIso("2026-12-31", "23:30")).toBe("2026-12-31T23:30:00+00:00");
    expect(lisbonParts("2026-09-30T22:30:00Z")).toEqual({ date: "2026-09-30", time: "23:30" });
  });
});
