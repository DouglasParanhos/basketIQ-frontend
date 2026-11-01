import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function noA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const found = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.html.slice(0, 120)} ${n.failureSummary?.split("\n")[1] ?? ""}`));
  expect(found).toEqual([]);
}
