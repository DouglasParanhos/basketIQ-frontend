import AxeBuilder from "@axe-core/playwright";
import { expect, ON_DEVICE, type Page } from "../fixtures";

export async function noA11yViolations(page: Page) {
  // The WebView cannot open the blank page axe finishes its run in: on the device it runs entirely in this page.
  const results = await new AxeBuilder({ page }).setLegacyMode(ON_DEVICE).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const found = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.html.slice(0, 120)} ${n.failureSummary?.split("\n")[1] ?? ""}`));
  expect(found).toEqual([]);
}
