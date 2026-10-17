/**
 * End-to-end against the real backend (cd ../Backend && make up) and `pnpm dev`.
 * Uses the backend's synthetic golden-set documents (no personal data).
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SYNTHETIC = process.env.BASKETIQ_SYNTHETIC_DIR ?? path.resolve(HERE, "../../../Backend/tests/golden/synthetic");
const doc = (name: string, file = "document.pdf") => path.join(SYNTHETIC, name, file);

async function signIn(page: Page, subject: string) {
  await page.goto("/login");
  await page.getByRole("link", { name: "Entrar com Google" }).click();
  // Local mock OIDC server (Google in staging/production).
  await page.getByPlaceholder("Enter any user/subject").fill(subject);
  await page.getByRole("button", { name: "Sign-in" }).click();
  await expect(page).toHaveURL(/\/privacidade$/);
  await page.getByRole("button", { name: "Aceitar e continuar" }).click();
  await expect(page.getByRole("heading", { name: "Comece pela primeira nota" })).toBeVisible();
}

async function upload(page: Page, file: string, input = "input-pdf") {
  await page.goto("/adicionar");
  await page.getByTestId(input).setInputFiles(file);
  await page.getByRole("button", { name: "Enviar nota" }).click();
  await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/);
}

test.describe.configure({ mode: "serial" });

test("journey: import, review, confirm, analyse, delete", async ({ page }) => {
  test.setTimeout(240_000);
  const subject = `e2e-${Date.now()}`;
  await signIn(page, subject);

  // F-04 / F-26 / F-15a: searchable PDF, high confidence → confirmed automatically.
  await upload(page, doc("pingo_doce_text"));
  await expect(page.getByText("Confirmada automaticamente", { exact: false })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("PEITO FRANGO")).toBeVisible();

  // F-17: the same file again is flagged before uploading.
  await page.goto("/adicionar");
  await page.getByTestId("input-pdf").setInputFiles(doc("pingo_doce_text"));
  await page.getByRole("button", { name: "Enviar nota" }).click();
  await expect(page.getByText("Esta nota parece já ter sido importada")).toBeVisible();

  // F-15b / F-12 / F-13: totals do not reconcile → review; fix the total and confirm.
  await upload(page, doc("pingo_doce_mismatch"));
  await expect(page.getByText("Reveja antes de confirmar")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("A soma das linhas não coincide com o total da nota.")).toBeVisible();
  // It is the same purchase as the first one (same shop, minute and lines): keep both on purpose.
  const keep = page.getByRole("button", { name: "Manter as duas" });
  if (await keep.isVisible()) await keep.click();
  await page.getByLabel("Total da nota").fill("18,17");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Reveja antes de confirmar")).toBeHidden({ timeout: 15_000 });
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Confirmada por si", { exact: false })).toBeVisible();

  // F-05 / F-27: a photo goes through local OCR (PaddleOCR in the worker).
  await upload(page, doc("lidl_photo", "document.png"), "input-image");
  await expect(page.getByText(/Confirmada|Reveja antes de confirmar/).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/IOGURTE NATURAL/)).toBeVisible();

  // F-18 / F-19: September 2026 dashboard, then filtered by Lidl.
  await page.goto("/?de=2026-09-01&ate=2026-09-30");
  await expect(page.getByText("Gasto total")).toBeVisible();
  const total = page.getByRole("heading", { name: "Gasto total" }).locator("..").locator("p").first();
  await expect(total).toHaveText("45,39 €"); // 18,17 + 18,17 (Pingo Doce) + 9,05 (Lidl photo)
  await page.getByLabel("Supermercado", { exact: true }).selectOption("PINGO_DOCE");
  await expect(total).toHaveText("36,34 €");

  // F-20: product history.
  await page.goto("/produtos?q=frango");
  await page.getByRole("link", { name: /PEITO FRANGO/ }).click();
  await expect(page.getByText("Preço médio por kg")).toBeVisible();
  await expect(page.getByText("5,99 €").first()).toBeVisible();

  // F-22: deleting a purchase removes it from the dashboard.
  await page.goto("/compras?filtro=confirmadas");
  await page.getByRole("link", { name: /Pingo Doce/ }).first().click();
  await page.getByRole("button", { name: "Eliminar compra" }).click();
  await page.getByRole("button", { name: "Eliminar compra" }).last().click();
  await expect(page).toHaveURL(/\/compras$/);
  await page.goto("/?de=2026-09-01&ate=2026-09-30&mercado=PINGO_DOCE");
  await expect(total).toHaveText("18,17 €");

  // F-23: account deletion.
  await page.goto("/definicoes");
  await page.getByRole("button", { name: "Eliminar conta" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Eliminar conta e dados" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("CFG-02: name, title and manifest come from the backend's config/app-config.yaml", async ({ page, request }) => {
  const config = await request.get("/v1/config");
  expect(await config.json()).toEqual({ app_name: "Super Mercado" });
  const manifest = await request.get("/v1/config/manifest.webmanifest");
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
  expect((await manifest.json()).name).toBe("Super Mercado");

  await page.goto("/login");
  await expect(page).toHaveTitle("Super Mercado");
  await expect(page.getByText(/O Super Mercado lê os produtos/)).toBeVisible();
});

test("F-03: cancelling at the identity provider returns to sign-in with a message", async ({ page }) => {
  await page.goto("/v1/auth/callback?error=access_denied&state=x");
  await expect(page).toHaveURL(/\/login\?error=cancelled/);
  await expect(page.getByText(/foi cancelado/)).toBeVisible();
});

test("SEC: another account cannot open my receipt", async ({ browser }) => {
  const alice = await browser.newPage();
  await signIn(alice, `alice-${Date.now()}`);
  await upload(alice, doc("lidl_text"));
  const url = alice.url();
  const bob = await browser.newPage();
  await signIn(bob, `bob-${Date.now()}`);
  await bob.goto(url.replace("http://localhost:5173", ""));
  await expect(bob.getByText("Compra não encontrada", { exact: true })).toBeVisible();
  await expect(bob.getByText("IOGURTE NATURAL")).toHaveCount(0);
});
