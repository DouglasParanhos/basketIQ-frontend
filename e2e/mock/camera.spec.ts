import { expect, test, type Locator, type Page } from "@playwright/test";
import { noA11yViolations } from "./a11y";
import { fakeApi } from "./api";
import { fakeCamera, type SceneName } from "./fakeCamera";

// The camera shows a synthetic receipt (fakeCamera.ts): the in-app camera must give the right advice for
// each picture, and let the person take the parts of a long receipt (spec 013 US4).

async function openCamera(page: Page, scene: SceneName): Promise<Locator> {
  await fakeApi(page);
  await fakeCamera(page, scene);
  await page.goto("/adicionar");
  await page.getByRole("button", { name: /Fotografar/ }).click();
  const dialog = page.getByRole("dialog", { name: "Fotografar o talão" });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** The advice on screen, as a screen reader hears it. */
const advice = (dialog: Locator) => dialog.locator("[aria-live=polite]");

test.describe("in-app camera (spec 013 US4)", () => {
  test("a receipt that fits: the photo is taken by itself, then the parts screen, without a warning", async ({ page }) => {
    const dialog = await openCamera(page, "framed");
    await expect(dialog).toBeHidden(); // no tap: «ok» took the photo, and the receipt fit in one, so nothing asks for more
    await expect(page.getByRole("heading", { name: "Confirme as partes" })).toBeVisible();
    await expect(page.getByText("parte-1.jpg")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar talão" })).toBeVisible();
    await expect(page.getByRole("button", { name: /fotografar de novo/i })).toBeHidden(); // the backend would not warn about it
  });

  const ADVICE = {
    far: "Aproxime a câmara do talão",
    lightDesk: "Pouse o talão num fundo escuro: assim vemos onde acaba",
    tooClose: "Afaste um pouco a câmara",
  } satisfies Partial<Record<SceneName, string>>;

  for (const [scene, text] of Object.entries(ADVICE) as [SceneName, string][]) {
    test(`${scene}: advises «${text}», and the shutter still works`, async ({ page }) => {
      const dialog = await openCamera(page, scene);
      await expect(advice(dialog)).toHaveText(text);
      if (scene === "far") await noA11yViolations(page); // the advice in yellow; the green «ok» is checked below
      await expect(dialog).toBeVisible(); // advice other than «ok» does not take the photo by itself
      await dialog.getByRole("button", { name: "Tirar a foto" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("parte-1.jpg")).toBeVisible();
    });
  }

  test("a receipt too long for one photo: three parts, each from where the last ended, a cut top and bottom fine; no axe violations", async ({ page }) => {
    const dialog = await openCamera(page, "tooLong");
    const shutter = dialog.getByRole("button", { name: "Tirar a foto" });
    await expect(advice(dialog)).toHaveText("O talão não cabe: afaste-se ou fotografe por partes");
    await shutter.click();
    for (const n of [2, 3]) {
      await page.getByRole("button", { name: "Adicionar outra parte" }).click();
      await expect(dialog.getByText(`Parte ${n} · comece onde a parte ${n - 1} acabou`)).toBeVisible();
      await expect(dialog.getByText("Linhas já fotografadas")).toBeVisible();
      // A part may be cut top and bottom. The picture has not moved since the last part, so it is not taken by
      // itself: the dialog is still open for the shutter.
      await expect(advice(dialog)).toHaveText("Talão detetado · segure firme");
      if (n === 2) await noA11yViolations(page);
      await shutter.click();
      await expect(dialog).toBeHidden();
    }
    await expect(page.getByRole("button", { name: "Enviar talão · 3 fotos" })).toBeVisible();
    for (const n of [1, 2, 3]) await expect(page.getByText(`parte-${n}.jpg`)).toBeVisible();
  });
});
