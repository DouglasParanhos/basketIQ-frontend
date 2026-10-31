import { describe, expect, it } from "vitest";
import { currentMonth, formatDayMonth, monthLabel, monthRange, parseMonth, shiftMonth } from "./month";

describe("months of the Início (spec 011)", () => {
  it("F-188: currentMonth is the month in Lisbon, not in UTC", () => {
    // In September Lisbon is UTC+1: 23:30Z on the 30th is already 1 October there.
    expect(currentMonth(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10");
    // After 25 October Lisbon is UTC+0: 23:30Z on the 31st is still 31 October.
    expect(currentMonth(new Date("2026-10-31T23:30:00Z"))).toBe("2026-10");
    expect(currentMonth(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07");
    expect(currentMonth(new Date("2026-12-31T23:30:00Z"))).toBe("2026-12");
  });

  it("F-188: parseMonth accepts only a real YYYY-MM", () => {
    expect(parseMonth("2026-09")).toBe("2026-09");
    for (const bad of ["lixo", "2026-13", "2026-00", "2026-9", "", null, "2026-09-01", "26-09"]) {
      expect(parseMonth(bad)).toBeNull();
    }
  });

  it("F-188: shiftMonth crosses the year", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-10", -1)).toBe("2026-09");
  });

  it("F-188: the label says «Este mês» for the current month and names the others", () => {
    expect(monthLabel("2026-10", "2026-10")).toBe("Este mês");
    expect(monthLabel("2026-09", "2026-10")).toBe("setembro de 2026");
  });

  it("F-188: the range goes from the first to the last day of the month", () => {
    expect(monthRange("2026-10")).toBe("1 – 31 out. 2026");
    expect(monthRange("2026-02")).toBe("1 – 28 fev. 2026");
    expect(monthRange("2028-02")).toBe("1 – 29 fev. 2028");
  });

  it("F-186: a day is written as «27 out.», with no year and no dependence on the ICU data", () => {
    expect(formatDayMonth("2026-10-27")).toBe("27 out.");
    expect(formatDayMonth("2026-01-05")).toBe("5 jan.");
    expect(formatDayMonth("2026-09-30T10:00:00Z")).toBe("30 set.");
  });
});
