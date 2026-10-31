import { describe, expect, it } from "vitest";
import { overviewFor, overviewGreen, overviewNoGoal, overviewOrange, overviewOver, overviewRed } from "../../test/fixtures";
import { ringView as rawRingView } from "./ringView";

/** formatCents puts a no-break space before the euro sign (right in print): the tests compare with a plain space. */
const plain = (s: string) => s.replace(/\u00a0/g, " ");
const ringView: typeof rawRingView = (overview, isCurrentMonth) => {
  const v = rawRingView(overview, isCurrentMonth);
  return { ...v, text: plain(v.text) };
};

const FORBIDDEN = /excedeu|perdeu|negativ|limite|−|-\d/i;

describe("the goal ring, as the API describes it (spec 011, US1)", () => {
  it("F-183: green, orange and red say the band in words, the balance and the percentage", () => {
    const green = ringView(overviewGreen, true);
    expect(green).toMatchObject({ tone: "ok", text: "Tranquilo · saldo da meta: 248,00 €", percentText: "38 %", ariaLabel: "Anel verde, 38 % da meta usada", dash: "148 390" });

    const orange = ringView(overviewOrange, true);
    expect(orange).toMatchObject({ tone: "warn", text: "Quase lá · saldo da meta: 152,00 €", ariaLabel: "Anel laranja, 62 % da meta usada", dash: "242 390" });

    const red = ringView(overviewRed, true);
    expect(red).toMatchObject({ tone: "alert", text: "Reta final · saldo da meta: 48,00 €", ariaLabel: "Anel vermelho, 88 % da meta usada", dash: "343 390" });
  });

  it("F-183: without a goal the ring is empty, dashed, with «—» and the invitation", () => {
    expect(ringView(overviewNoGoal, true)).toMatchObject({
      tone: "none",
      text: "Sem meta pessoal definida",
      percentText: "—",
      ariaLabel: "Anel sem meta definida",
      dash: "3 12",
    });
  });

  it("F-183: spending exactly the goal is still «Reta final», with a balance of zero", () => {
    const exact = ringView({ ...overviewGreen, spent_cents: 40000, goal_pct: 100, band: "high" }, true);
    expect(exact).toMatchObject({ tone: "alert", text: "Reta final · saldo da meta: 0,00 €", percentText: "100 %", dash: "390 390" });
  });

  it("F-183: above the goal says so without «excedeu» or a minus sign, and the stroke stops at 100 %", () => {
    const over = ringView(overviewOver, true);
    expect(over).toMatchObject({ tone: "alert", text: "Acima da meta pessoal este mês · 52,00 € além da meta", percentText: "113 %", dash: "390 390" });
    expect(over.text).not.toMatch(FORBIDDEN);
  });

  it("F-183: the text follows the sign of goal − spent, not goal_pct, which rounds", () => {
    // 401,00 € of 400,00 €: goal_pct rounds to 100 but the person is above the goal.
    expect(ringView({ ...overviewGreen, spent_cents: 40100, goal_pct: 100, band: "high" }, true).text).toBe("Acima da meta pessoal este mês · 1,00 € além da meta");
    // 399,00 € of 400,00 €: goal_pct is 100 too, but there is still a balance.
    expect(ringView({ ...overviewGreen, spent_cents: 39900, goal_pct: 100, band: "high" }, true).text).toBe("Reta final · saldo da meta: 1,00 €");
  });

  it("F-183: the six boundary cases show the percentage and the band the API gave, without recalculating them", () => {
    const cases: [number, string, string][] = [
      [20000, "50 %", "ok"],
      [20160, "50 %", "ok"],
      [20200, "51 %", "warn"],
      [30000, "75 %", "warn"],
      [30160, "75 %", "warn"],
      [30200, "76 %", "alert"],
    ];
    for (const [spent, pct, tone] of cases) {
      const view = ringView(overviewFor(spent), true);
      expect(view.percentText, String(spent)).toBe(pct);
      expect(view.tone, String(spent)).toBe(tone);
    }
    // A band that disagrees with the percentage: the API's wins.
    expect(ringView({ ...overviewFor(20000), band: "high" }, true).tone).toBe("alert");
  });

  it("F-183: in a month that is not the current one the goal is marked as the current goal", () => {
    const past = ringView(overviewGreen, false);
    expect(past.goalNote).toBe("Meta atual");
    expect(past.ariaLabel).toBe("Anel verde, 38 % da meta atual usada");
    expect(ringView(overviewGreen, true).goalNote).toBeNull();
  });

  it("F-183: no text uses a forbidden word", () => {
    for (const overview of [overviewGreen, overviewOrange, overviewRed, overviewOver, overviewNoGoal]) {
      const view = ringView(overview, true);
      expect([view.text, view.ariaLabel, view.percentText].join(" ")).not.toMatch(FORBIDDEN);
    }
  });
});
