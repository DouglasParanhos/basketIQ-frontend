/**
 * End-to-end against the real backend (cd ../basketIQ-backend && make up) and `pnpm dev`.
 * Uses the backend's synthetic golden-set documents (no personal data).
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signInWithGoogle } from "./signIn";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SYNTHETIC = process.env.BASKETIQ_SYNTHETIC_DIR ?? path.resolve(HERE, "../../../basketIQ-backend/tests/golden/synthetic");
const doc = (name: string, file = "document.pdf") => path.join(SYNTHETIC, name, file);

async function signIn(page: Page, subject: string) {
  await signInWithGoogle(page, subject);
  // The empty-account message now lives in the Resumo, under Talões (spec 009).
  await page.goto("/compras/resumo");
  await expect(page.getByRole("heading", { name: "Comece pelo primeiro talão" })).toBeVisible();
}

async function upload(page: Page, file: string, input = "input-pdf") {
  await page.goto("/adicionar");
  await page.getByTestId(input).setInputFiles(file);
  await page.getByRole("button", { name: "Enviar talão" }).click();
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
  await page.getByRole("button", { name: "Enviar talão" }).click();
  await expect(page.getByText("Este talão parece já ter sido importado")).toBeVisible();

  // F-15b / F-12 / F-13: totals do not reconcile → review; fix the total and confirm.
  await upload(page, doc("pingo_doce_mismatch"));
  await expect(page.getByText("Reveja antes de confirmar")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/A soma das linhas \(.*não coincide com o total do talão/)).toBeVisible();
  // It is the same purchase as the first one (same shop, minute and lines): keep both on purpose.
  const keep = page.getByRole("button", { name: "Manter as duas" });
  if (await keep.isVisible()) await keep.click();
  await page.getByRole("button", { name: "Editar total do talão" }).click();
  await page.getByRole("textbox", { name: "Total do talão" }).fill("18,17");
  await page.getByRole("button", { name: "Editar total do talão" }).click(); // closes the field: the foot is away while it is open
  const reviewUrl = page.url();
  await page.getByRole("button", { name: "Guardar e rever depois", exact: true }).click();
  await expect(page).toHaveURL(/\/compras$/); // «rever depois» goes back to the list; the purchase is still there to confirm
  await page.goto(reviewUrl);
  await expect(page.getByText("Reveja antes de confirmar")).toBeHidden({ timeout: 15_000 });
  await page.getByRole("button", { name: "Confirmar talão", exact: true }).click();
  await expect(page.getByText("Confirmada por si", { exact: false })).toBeVisible();

  // F-05 / F-27: a photo goes through local OCR (PaddleOCR in the worker). Until the description check exists every
  // photo goes to review (backend rule D1(a), photo_not_verified), so it is confirmed by hand.
  await upload(page, doc("lidl_photo", "document.png"), "input-image");
  await expect(page.getByText("Reveja antes de confirmar")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/lida a partir de uma imagem/)).toBeVisible();
  await expect(page.getByText(/IOGURTE NATURAL/)).toBeVisible();
  await page.getByRole("button", { name: "Confirmar talão", exact: true }).click();
  await expect(page.getByText("Confirmada por si", { exact: false })).toBeVisible();

  // F-18 / F-19: September 2026 dashboard, then filtered by Lidl.
  await page.goto("/?de=2026-09-01&ate=2026-09-30");
  await expect(page.getByRole("heading", { name: /^Gasto em supermercados/ })).toBeVisible();
  const total = page.getByRole("heading", { name: /^Gasto em supermercados/ }).locator("..").locator("p").first();
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
  await page.goto("/definicoes/conta");
  await page.getByRole("link", { name: "Eliminar conta…" }).click();
  await page.getByRole("checkbox").check({ force: true });
  await page.getByRole("button", { name: "Eliminar a minha conta" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("CFG-02: name, title and manifest come from the backend's config/app-config.yaml", async ({ page, request }) => {
  const config = await request.get("/v1/config");
  expect(await config.json()).toMatchObject({ app_name: "Super Mercado" }); // the exact public keys: backend F-176
  const manifest = await request.get("/v1/config/manifest.webmanifest");
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
  expect((await manifest.json()).name).toBe("Super Mercado");

  await page.goto("/login");
  await expect(page).toHaveTitle("Entrar · Super Mercado");
  await expect(page.getByRole("heading", { level: 1, name: "Super Mercado" })).toBeVisible();
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
