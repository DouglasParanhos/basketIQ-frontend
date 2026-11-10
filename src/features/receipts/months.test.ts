import { describe, expect, it } from "vitest";
import { monthTotals, receiptItem } from "../../test/fixtures";
import { defaultYear, groupByMonth, headerSummary, monthKey, yearOf, yearsToShow } from "./months";

const plain = (s: string) => s.replace(/\u00a0/g, " ");
const sent = (created_at: string, purchase_at: string | null = null) => receiptItem({ id: created_at, created_at, purchase_at });

describe("months of the list of purchases (spec 012)", () => {
  it("F-195: the month is the one in Lisbon, by the date of the purchase", () => {
    // In September Lisbon is UTC+1: 23:30Z on the 30th is already 1 October there.
    expect(monthKey(sent("2026-10-02T09:00:00Z", "2026-09-30T23:30:00Z"))).toBe("2026-10");
    // After 25 October Lisbon is UTC+0: 23:30Z on the 31st is still October.
    expect(monthKey(sent("2026-11-02T09:00:00Z", "2026-10-31T23:30:00Z"))).toBe("2026-10");
    expect(monthKey(sent("2026-11-02T09:00:00Z", "2026-11-01T00:30:00+00:00"))).toBe("2026-11");
  });

  it("F-195: without a purchase date (still being read) the date of sending is used", () => {
    expect(monthKey(sent("2026-10-29T10:00:00Z", null))).toBe("2026-10");
    expect(yearOf(sent("2025-12-31T23:30:00Z", null))).toBe(2025);
    expect(yearOf(sent("2026-01-01T09:00:00Z", "2025-12-30T10:00:00Z"))).toBe(2025);
  });

  it("F-195: groupByMonth orders by the date of the purchase, not by the order the API sent, and names the month", () => {
    // The API orders by sending: a September purchase sent in October comes first.
    const groups = groupByMonth([sent("2026-10-05T10:00:00Z", "2026-09-28T10:00:00Z"), sent("2026-10-03T10:00:00Z", "2026-10-02T10:00:00Z"), sent("2026-10-01T10:00:00Z", "2026-10-01T10:00:00Z")]);
    expect(groups.map((g) => [g.key, g.title, g.rows.length])).toEqual([
      ["2026-10", "Outubro 2026", 2],
      ["2026-09", "Setembro 2026", 1],
    ]);
    expect(groups[0]!.rows.map((r) => r.purchase_at)).toEqual(["2026-10-02T10:00:00Z", "2026-10-01T10:00:00Z"]);
  });

  it("F-195: the header has the confirmed count and total of the endpoint, with the singular", () => {
    const [october, september] = groupByMonth([sent("2026-10-24T10:00:00Z", "2026-10-24T10:00:00Z"), sent("2026-09-24T10:00:00Z", "2026-09-24T10:00:00Z")]);
    expect(plain(headerSummary(october!, monthTotals, "todas")!)).toBe("7 confirmados · 248,00 €");
    expect(plain(headerSummary(september!, monthTotals, "confirmadas")!)).toBe("5 confirmados · 322,00 €");
    expect(plain(headerSummary(october!, [{ month: "2026-10", confirmed_count: 1, total_cents: 2895 }], "todas")!)).toBe("1 confirmado · 28,95 €");
  });

  it("F-195: the header is only the month when there are no confirmed ones, in «Por confirmar», or without totals", () => {
    const [october] = groupByMonth([sent("2026-10-24T10:00:00Z", "2026-10-24T10:00:00Z")]);
    expect(headerSummary(october!, monthTotals, "acao")).toBeNull();
    expect(headerSummary(october!, [{ month: "2026-09", confirmed_count: 1, total_cents: 1 }], "todas")).toBeNull();
    expect(headerSummary(october!, undefined, "todas")).toBeNull();
  });

  it("F-195: the default year is the one of the purchase sent most recently, the first of the list; without purchases, the current one", () => {
    expect(defaultYear([sent("2026-10-29T10:00:00Z", "2025-12-30T10:00:00Z"), sent("2026-10-01T10:00:00Z")], 2026)).toBe(2025);
    expect(defaultYear([sent("2026-01-02T10:00:00Z", "2026-01-01T10:00:00Z")], 2026)).toBe(2026);
    expect(defaultYear([], 2026)).toBe(2026);
  });

  it("F-195: the years to offer are the ones of the totals, the default and the current, newest first, without repeats", () => {
    expect(yearsToShow(monthTotals, 2026, 2026)).toEqual([2026, 2025]);
    expect(yearsToShow([], 2026, 2026)).toEqual([2026]);
    expect(yearsToShow(monthTotals, 2024, 2027)).toEqual([2027, 2026, 2025, 2024]);
    expect(yearsToShow(undefined, 2026, 2026)).toEqual([2026]);
  });
});
