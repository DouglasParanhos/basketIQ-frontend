import { expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The backend's synthetic golden-set documents (no personal data). */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SYNTHETIC = process.env.BASKETIQ_SYNTHETIC_DIR ?? path.resolve(HERE, "../../../basketIQ-backend/tests/golden/synthetic");
export const doc = (name: string, file = "document.pdf") => path.join(SYNTHETIC, name, file);

/** Adds a receipt from a file and waits for its page. */
export async function upload(page: Page, file: string, input = "input-pdf") {
  await page.goto("/adicionar");
  await page.getByTestId(input).setInputFiles(file);
  await page.getByRole("button", { name: "Enviar talão" }).click();
  await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/);
}
