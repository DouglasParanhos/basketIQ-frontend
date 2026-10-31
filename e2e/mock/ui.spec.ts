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
  test("revisão has no axe violations", async ({ page }) => {
    await fakeApi(page);
    await page.goto("/compras/r1");
    await expect(page.locator("main").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await noA11yViolations(page);
  });

  // The destinations of the bottom navigation (and the Talões tabs), in both colour schemes at the
  // narrowest and widest widths of the plan (§10 and §11).
  for (const scheme of ["light", "dark"] as const) {
    for (const width of [320, 820]) {
      for (const [name, path] of [
        ["início", "/"],
        ["resumo", "/compras/resumo"],
        ["compras", "/compras"],
        ["produtos", "/produtos"],
        ["adicionar", "/adicionar"],
        ["definições", "/definicoes"],
      ] as const) {
        test(`F-99: ${name} has no axe violations (${scheme}, ${width}px)`, async ({ page }) => {
          await page.emulateMedia({ colorScheme: scheme });
          await page.setViewportSize({ width, height: 800 });
          await fakeApi(page);
          await page.goto(path);
          await expect(page.locator("main").first()).toBeVisible();
          await page.waitForLoadState("networkidle");
          await noA11yViolations(page);
        });
      }
    }
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
      for (const path of ["/", "/compras/resumo", "/compras/r1", "/adicionar"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await noHorizontalScroll(page);
      }
    });
  }

  for (const [smartList, expected] of [
    [false, ["Início", "Talões", "Adicionar", "Definições"]],
    [true, ["Início", "Talões", "Adicionar", "Lista", "Definições"]],
  ] as const) {
    test(`F-91: bottom navigation reachable with one hand: ${expected.length} items, ≥ 44px targets, fits at 320px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await fakeApi(page, { smartList });
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: "Navegação principal" });
      const links = nav.getByRole("link");
      await expect(links).toHaveText([...expected]);
      for (const box of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.bottom).toBeGreaterThan(500); // anchored at the bottom of the screen
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(320); // every destination fully visible
      }
      await noHorizontalScroll(page);
    });
  }
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
  test("F-01: first access asks for privacy consent, then shows the Início", async ({ page }) => {
    await fakeApi(page, { consented: false });
    await page.goto("/");
    await expect(page).toHaveURL(/\/privacidade$/);
    await page.getByRole("button", { name: "Aceitar e continuar" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
    await page.getByRole("link", { name: "Ver resumo" }).click();
    await expect(page.getByText("Gasto total")).toBeVisible();
  });

  test("F-21: empty account explains how to import the first receipt", async ({ page }) => {
    await fakeApi(page, { empty: true });
    await page.goto("/compras/resumo");
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
    await page.goto("/compras/resumo");
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
    // The Resumo tab loads data, so it discovers the lost session (the Início makes no requests).
    await page.getByRole("tab", { name: "Resumo" }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(page).toHaveURL(/\/login\?error=session_expired/);
    await expect(page.getByText(/A sua sessão terminou/)).toBeVisible();
  });
});

// ---------------------------------------------------------------- onboarding (spec 010)

const ONBOARDING_STEPS = [/Qual é o seu objetivo/, /Quantas pessoas vivem/, /Onde costuma fazer compras/, /Qual é a sua meta pessoal por mês/];

/** Walks the four steps and «Tudo pronto», running `check` on each screen. */
async function walkOnboarding(page: Page, check: () => Promise<void>) {
  await page.goto("/boas-vindas");
  for (const [index, title] of ONBOARDING_STEPS.entries()) {
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    if (index === 2) await expect(page.getByRole("checkbox", { name: "Lidl" })).toBeVisible();
    // The page has moved on to this step before axe looks at it.
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String((index + 1) * 25));
    await check();
    await page.getByRole("button", { name: index === 3 ? "Concluir" : "Avançar" }).click();
  }
  await expect(page.getByRole("heading", { level: 1, name: "Tudo pronto" })).toBeVisible();
  await check();
}

test.describe("onboarding (spec 010)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const width of [320, 375, 430, 820]) {
      test(`F-117: every step and «Tudo pronto» have no axe violations and no horizontal scroll (${scheme}, ${width}px)`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize({ width, height: 800 });
        await fakeApi(page, { onboarded: false });
        await walkOnboarding(page, async () => {
          await noA11yViolations(page);
          await noHorizontalScroll(page);
        });
      });
    }
  }

  test("F-117: every control of the onboarding has a touch target of at least 44 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await fakeApi(page, { onboarded: false });
    await walkOnboarding(page, async () => {
      const small = await page.locator("main button:visible, main label:visible, main input[type=range]:visible, main a:visible").evaluateAll((nodes) =>
        nodes
          .map((node) => ({ text: (node.textContent ?? node.getAttribute("aria-label") ?? "").trim().slice(0, 30), box: node.getBoundingClientRect() }))
          .filter(({ box }) => box.height < 43.5 || box.width < 43.5)
          .map(({ text, box }) => `${text}: ${Math.round(box.width)}x${Math.round(box.height)}`),
      );
      expect(small).toEqual([]);
    });
  });

  test("F-113: a new account is sent to the onboarding, completes it, and lands on the Início", async ({ page }) => {
    const state = await fakeApi(page, { onboarded: false });
    await page.goto("/");
    await expect(page).toHaveURL(/\/boas-vindas$/);
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);
    await page.getByRole("checkbox", { name: /Organizar as minhas finanças/ }).check({ force: true });
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("button", { name: "Mais uma pessoa" }).click();
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("checkbox", { name: "El Corte Inglés" }).check({ force: true });
    await expect(page.getByText("EC", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("button", { name: "Concluir" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tudo pronto" })).toBeVisible();
    expect(state.profilePatches).toEqual([
      { goals: ["finances"], household_size: 3, merchants: ["EL_CORTE_INGLES"], monthly_goal_cents: 30000, onboarding_completed: true },
    ]);
    await page.getByRole("button", { name: "Ir para o início" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  });

  test("F-114: skipping the four steps saves only that the onboarding is done", async ({ page }) => {
    const state = await fakeApi(page, { onboarded: false });
    await page.goto("/boas-vindas");
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Saltar" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tudo pronto" })).toBeVisible();
    expect(state.profilePatches).toEqual([{ onboarding_completed: true }]);
  });

  test("F-115: while the profile loads there is only the loading indicator, no navigation bar", async ({ page }) => {
    await fakeApi(page, { onboarded: false, profileDelayMs: 600 });
    await page.goto("/");
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Início" })).toHaveCount(0);
    await expect(page).toHaveURL(/\/boas-vindas$/);
  });

  test("F-115: an account that finished the onboarding goes from /boas-vindas to the Início", async ({ page }) => {
    await fakeApi(page);
    await page.goto("/boas-vindas");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
  });

  test("F-116: the onboarding writes nothing to localStorage or sessionStorage", async ({ page }) => {
    await fakeApi(page, { onboarded: false });
    await walkOnboarding(page, async () => undefined);
    const stored = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    expect(stored).toEqual({ local: [], session: [] });
  });
});

// ---------------------------------------------------------------- Definições (spec 014)

/** Walks the Perfil (reading, editing with a goal error, cancelling), Privacidade (with the confirmation), Conta and Eliminar conta. */
async function walkSettings(page: Page, check: () => Promise<void>) {
  await page.goto("/definicoes");
  await expect(page).toHaveURL(/\/definicoes\/perfil$/);
  await expect(page.getByRole("heading", { level: 2, name: "Perfil" })).toBeVisible();
  await check();
  await page.getByRole("button", { name: "Editar meta pessoal" }).click();
  await page.getByRole("textbox", { name: /Meta pessoal do mês/ }).fill("30");
  await expect(page.getByText("A meta tem de estar entre 50 € e 800 €.")).toBeVisible();
  await check();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText(/Descartar as/)).toBeVisible();
  await check();
  await page.getByRole("button", { name: "Continuar a editar" }).click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Perfil" })).toBeVisible();
  await page.getByRole("tab", { name: "Privacidade" }).click();
  await expect(page.getByText("9 ficheiros guardados agora")).toBeVisible();
  await check();
  await page.getByRole("button", { name: "Apagar agora" }).click();
  await expect(page.getByRole("heading", { name: "Apagar os ficheiros originais?" })).toBeVisible();
  await check();
  await page.getByRole("tab", { name: "Conta" }).click();
  await expect(page.getByText("Entrou com Google · maria@example.test")).toBeVisible();
  await check();
  await page.getByRole("link", { name: "Eliminar conta…" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Eliminar conta" })).toBeVisible();
  await page.getByRole("checkbox").check({ force: true });
  await check();
}

test.describe("definições (spec 014)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const width of [320, 375, 430, 820]) {
      test(`F-194: every tab and the delete screen have no axe violations and no horizontal scroll (${scheme}, ${width}px)`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize({ width, height: 800 });
        await fakeApi(page, { storedFiles: 9 });
        await walkSettings(page, async () => {
          await noA11yViolations(page);
          await noHorizontalScroll(page);
        });
      });
    }

    test(`F-194: the Perfil of an account from before the onboarding has no axe violations (${scheme}, 320px)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 800 });
      await fakeApi(page, { migrated: true });
      await page.goto("/definicoes/perfil");
      await expect(page.getByText("Ainda não definiu.").first()).toBeVisible();
      await noA11yViolations(page);
      await noHorizontalScroll(page);
    });
  }

  test("F-194: every control of the Definições has a touch target of at least 44 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await fakeApi(page, { storedFiles: 9, admin: true });
    await walkSettings(page, async () => {
      const small = await page
        .locator("main button:visible, main a:visible, main label:has(input):visible, main input:not([type=checkbox]):visible, main [role=tab]:visible")
        .evaluateAll((nodes) =>
          nodes
            .map((node) => ({ text: (node.textContent ?? node.getAttribute("aria-label") ?? "").trim().slice(0, 30), box: node.getBoundingClientRect() }))
            .filter(({ box }) => box.height < 43.5 || box.width < 43.5)
            .map(({ text, box }) => `${text}: ${Math.round(box.width)}x${Math.round(box.height)}`),
        );
      expect(small).toEqual([]);
    });
  });

  test("F-189: the tabs move with the arrows and open with Enter; the operator panel is offered to operators", async ({ page }) => {
    await fakeApi(page, { admin: true });
    await page.goto("/definicoes/perfil");
    await page.getByRole("tab", { name: "Perfil" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Privacidade" })).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/definicoes\/conta$/);
    await expect(page.getByRole("link", { name: "Abrir painel do operador" })).toBeVisible();
  });

  test("F-190: editing, saving and reloading keeps the goal; cancelling with changes asks first", async ({ page }) => {
    const state = await fakeApi(page);
    await page.goto("/definicoes/perfil");
    await page.getByRole("button", { name: "Editar meta pessoal" }).click();
    await page.getByRole("textbox", { name: /Meta pessoal do mês/ }).fill("450");
    await expect(page.getByText("1 alteração por guardar")).toBeVisible();
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Perfil guardado.")).toBeVisible();
    expect(state.profilePatches).toEqual([{ monthly_goal_cents: 45000 }]);
    await page.reload();
    await expect(page.getByText("450,00 €")).toBeVisible();

    await page.getByRole("button", { name: "Editar pessoas na casa" }).click();
    await page.getByRole("button", { name: "Mais uma pessoa" }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Descartar as 1 alteração?")).toBeVisible();
    await page.getByRole("button", { name: "Descartar", exact: true }).click();
    await expect(page.getByText("2 pessoas")).toBeVisible();
    expect(state.profilePatches).toHaveLength(1);
  });

  test("F-193: an account from before the onboarding defines the goal from ?editar=meta with one save", async ({ page }) => {
    const state = await fakeApi(page, { migrated: true });
    await page.goto("/definicoes/perfil?editar=meta");
    const goal = page.getByRole("textbox", { name: /Meta pessoal do mês/ });
    await expect(goal).toBeFocused();
    await goal.fill("350");
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Perfil guardado.")).toBeVisible();
    expect(state.profilePatches).toEqual([{ monthly_goal_cents: 35000 }]);
    await expect(page).toHaveURL(/\/definicoes\/perfil$/);
  });

  test("F-191: «Apagar agora» repeats the call until nothing remains (1 200 purchases, 3 calls)", async ({ page }) => {
    const state = await fakeApi(page, { storedFiles: 3600 });
    await page.goto("/definicoes/privacidade");
    await expect(page.getByText("3600 ficheiros guardados agora")).toBeVisible();
    await page.getByRole("button", { name: "Apagar agora" }).click();
    await page.getByRole("button", { name: "Apagar ficheiros" }).click();
    await expect(page.getByText("Nenhum ficheiro guardado")).toBeVisible();
    expect(state.storedFilesDeletes).toBe(3);
  });

  test("F-191: a failing delete says so and offers «Tentar de novo»", async ({ page }) => {
    await fakeApi(page, { storedFiles: 9, storedFilesFail: true });
    await page.goto("/definicoes/privacidade");
    await page.getByRole("button", { name: "Apagar agora" }).click();
    await page.getByRole("button", { name: "Apagar ficheiros" }).click();
    await expect(page.getByText(/Não foi possível apagar tudo/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  });

  test("F-192, F-23: deleting the account goes through its own screen and ends at the sign-in", async ({ page }) => {
    await fakeApi(page);
    await page.goto("/definicoes/conta");
    await page.getByRole("link", { name: "Eliminar conta…" }).click();
    await expect(page).toHaveURL(/\/definicoes\/conta\/eliminar$/);
    const confirm = page.getByRole("button", { name: "Eliminar a minha conta" });
    await expect(confirm).toBeDisabled();
    await page.getByRole("checkbox").check({ force: true });
    await confirm.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("F-194: the Definições write nothing to localStorage or sessionStorage", async ({ page }) => {
    await fakeApi(page, { storedFiles: 9 });
    await walkSettings(page, async () => undefined);
    const stored = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    expect(stored).toEqual({ local: [], session: [] });
  });
});
