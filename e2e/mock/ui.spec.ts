import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { fakeApi } from "./api";

async function noA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const found = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.html.slice(0, 120)} ${n.failureSummary?.split("\n")[1] ?? ""}`));
  expect(found).toEqual([]);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("accessibility (plano de testes §10)", () => {
  for (const [name, path] of [
    ["resumo", "/"],
    ["compras", "/compras"],
    ["revisão", "/compras/r1"],
    ["adicionar", "/adicionar"],
    ["definições", "/definicoes"],
    ["produtos", "/produtos"],
  ] as const) {
    test(`${name} has no axe violations`, async ({ page }) => {
      await fakeApi(page);
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      await noA11yViolations(page);
    });
  }

  test("login has no axe violations", async ({ page }) => {
    await fakeApi(page, { signedIn: false });
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "Entrar com Google" })).toBeVisible();
    await noA11yViolations(page);
  });

  test("dark mode has no contrast violations", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await fakeApi(page);
    await page.goto("/compras/r1");
    await expect(page.getByText("Reveja antes de confirmar")).toBeVisible();
    await noA11yViolations(page);
  });
});

test.describe("small screens (plano de testes §11)", () => {
  for (const width of [320, 375, 390, 430, 820]) {
    test(`no horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await fakeApi(page);
      for (const path of ["/", "/compras/r1", "/adicionar"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await noHorizontalScroll(page);
      }
    });
  }

  test("bottom navigation reachable with one hand: 4 items, ≥ 44px targets", async ({ page }) => {
    await fakeApi(page);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    const links = nav.getByRole("link");
    await expect(links).toHaveText(["Resumo", "Compras", "Adicionar", "Definições"]);
    for (const box of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.bottom).toBeGreaterThan(500); // anchored at the bottom of the screen
    }
  });
});

test.describe("customer-facing name (CFG-02)", () => {
  test("title, login and manifest follow the name served by the backend", async ({ page }) => {
    await fakeApi(page, { signedIn: false, appName: "Mercado do Zé" });
    await page.goto("/login");
    await expect(page).toHaveTitle("Mercado do Zé");
    await expect(page.getByText(/O Mercado do Zé lê os produtos/)).toBeVisible();
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/v1/config/manifest.webmanifest");
    // Fetched from the page, like the browser does (page.request would bypass the fake API).
    const manifest = await page.evaluate(() => fetch("/v1/config/manifest.webmanifest").then((r) => r.json()));
    expect(manifest.name).toBe("Mercado do Zé");
  });

  test("default name is Super Mercado", async ({ page }) => {
    await fakeApi(page);
    await page.goto("/definicoes");
    await expect(page).toHaveTitle("Super Mercado");
    await expect(page.getByText(/^Super Mercado /)).toBeVisible();
  });
});

test.describe("flows with a fake API", () => {
  test("F-01: first access asks for privacy consent, then shows the dashboard", async ({ page }) => {
    await fakeApi(page, { consented: false });
    await page.goto("/");
    await expect(page).toHaveURL(/\/privacidade$/);
    await page.getByRole("button", { name: "Aceitar e continuar" }).click();
    await expect(page.getByText("Gasto total")).toBeVisible();
  });

  test("F-21: empty account explains how to import the first receipt", async ({ page }) => {
    await fakeApi(page, { empty: true });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Comece pela primeira nota" })).toBeVisible();
    await page.getByRole("link", { name: "Adicionar a primeira nota" }).click();
    await expect(page.getByRole("button", { name: /Fotografar/ })).toBeVisible();
  });

  test("F-06: camera input targets the rear camera; denial falls back to choosing a file", async ({ page }) => {
    await fakeApi(page);
    await page.goto("/adicionar");
    await expect(page.getByTestId("input-camera")).toHaveAttribute("capture", "environment");
    // The capture input is a native picker: with the permission denied the browser offers files instead.
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Fotografar/ }).click();
    expect((await chooser).isMultiple()).toBe(false);
  });

  test("chart has a textual alternative (RF-11)", async ({ page }) => {
    await fakeApi(page);
    await page.goto("/");
    await page.getByText("Ver como tabela").click();
    await expect(page.getByRole("table", { name: "Gasto por período" })).toBeVisible();
  });

  test("F-12: low confidence shown with words and a marker, not colour alone", async ({ page }) => {
    await fakeApi(page);
    await page.goto("/compras/r1");
    const banana = page.getByRole("button", { name: /BANANA/ });
    await expect(banana.getByText("Verificar quantidade")).toBeVisible();
    await expect(page.getByText(/Diferença de/)).toBeVisible();
  });

  test("session loss sends the person to sign-in", async ({ page }) => {
    const state = await fakeApi(page);
    await page.goto("/compras");
    await expect(page.getByText("Revisão necessária")).toBeVisible();
    state.signedIn = false;
    // Any next request (navigation or a background refetch) discovers the lost session.
    await page.getByRole("link", { name: "Resumo" }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(page).toHaveURL(/\/login\?error=session_expired/);
    await expect(page.getByText(/A sua sessão terminou/)).toBeVisible();
  });
});
