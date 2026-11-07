import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { receipt } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server } from "../../test/server";
import { revertField, setField, toDraft } from "./draft";
import { ReceiptPage } from "./ReceiptPage";

const open = () =>
  renderRoutes(
    [
      { path: "/compras/:id", element: <ReceiptPage /> },
      { path: "/compras", element: <p>lista</p> },
    ],
    "/compras/r1",
  );

/** The foot of the review: the sentence above the three actions. */
const foot = () => screen.getByText("Ao confirmar, os valores entram nos seus gastos.").parentElement as HTMLElement;

/** Opens the line «LEITE MEIO GORDO» (85 cents each, 1,70 in all) with its pencil and types a new total, then leaves the field. */
async function correctTotal(user: ReturnType<typeof userEvent.setup>, value: string) {
  const pencil = () => screen.queryByRole("button", { name: /editar leite meio gordo/i });
  // The pencil is there until the panel is open (a second correction finds it open already).
  await waitFor(() => expect(pencil() ?? screen.queryByLabelText("Preço total (€)")).not.toBeNull());
  if (pencil()) await user.click(pencil()!);
  const total = screen.getByLabelText("Preço total (€)");
  await user.clear(total);
  await user.type(total, value);
  await user.tab();
}

/** «Guardar» in the panel of the open line: it closes the panel, and the foot is back. */
const saveLine = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Guardar" }));

describe("Rever talão (approved design)", () => {
  it("the warning to review is the neutral notice (no gold or brown), with the warning icon, and says it in words", async () => {
    open();
    const notice = (await screen.findByText("Reveja antes de confirmar")).closest("[role=status]") as HTMLElement;
    expect(notice.className).toContain("bg-notice");
    expect(notice.className).not.toContain("bg-warn-soft");
    expect(notice.className).toContain("text-ink");
    expect(notice.querySelector("svg[aria-hidden=true]")).not.toBeNull();
  });

  it("the foot has the three actions in the order of the design: «Confirmar talão» (56 px), «Guardar e rever depois» and «Eliminar talão» in red", async () => {
    open();
    await screen.findByText("Reveja antes de confirmar");
    const buttons = within(foot()).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Confirmar talão", "Guardar e rever depois", "Eliminar talão"]);
    expect(buttons[0]!.className).toContain("min-h-14");
    expect(buttons[0]!.className).toContain("rounded-[28px]");
    for (const b of buttons.slice(1)) expect(b.className).toContain("min-h-11");
    expect(buttons[2]!.className).toContain("text-alert");
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
  });

  it("the title of the purchase is set in Fraunces", async () => {
    open();
    await screen.findByText("Reveja antes de confirmar");
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("font-display");
  });

  describe("«Guardar e rever depois»", () => {
    it("without changes it only goes back to the list: nothing is sent", async () => {
      let patches = 0;
      server.use(
        http.patch(`${API}/v1/receipts/r1`, () => {
          patches += 1;
          return HttpResponse.json(receipt());
        }),
      );
      open();
      await userEvent.setup().click(await screen.findByRole("button", { name: "Guardar e rever depois" }));
      expect(await screen.findByText("lista")).toBeInTheDocument();
      expect(patches).toBe(0);
    });

    it("saves what was edited and then goes back to the list", async () => {
      let patch: unknown = null;
      server.use(
        http.patch(`${API}/v1/receipts/r1`, async ({ request }) => {
          patch = await request.json();
          return HttpResponse.json(receipt({ version: 4 }));
        }),
      );
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      await saveLine(user);
      await user.click(screen.getByRole("button", { name: "Guardar e rever depois" }));
      expect(await screen.findByText("lista")).toBeInTheDocument();
      expect(patch).toMatchObject({ version: 3, lines: [{ id: "l1", line_total_cents: 190 }, { id: "l2" }] });
    });

    it("a failure to save stays on the screen, with the message, and the button works again", async () => {
      server.use(http.patch(`${API}/v1/receipts/r1`, () => HttpResponse.json(errorBody("internal_error", "Não foi possível guardar."), { status: 500 })));
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      await saveLine(user);
      await user.click(screen.getByRole("button", { name: "Guardar e rever depois" }));
      expect(await screen.findByText("Não foi possível guardar.")).toBeVisible();
      expect(screen.queryByText("lista")).toBeNull();
      expect(screen.getByRole("button", { name: "Guardar e rever depois" })).toBeEnabled();
    });

    it("a version conflict stays on the screen and says the purchase changed", async () => {
      server.use(http.patch(`${API}/v1/receipts/r1`, () => HttpResponse.json(errorBody("version_conflict", "x"), { status: 409 })));
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      await saveLine(user);
      await user.click(screen.getByRole("button", { name: "Guardar e rever depois" }));
      expect(await screen.findByText(/foi alterada noutro dispositivo/)).toBeVisible();
      expect(screen.queryByText("lista")).toBeNull();
    });

    it("an invalid value in the line cannot be saved, so the line stays open", async () => {
      const user = userEvent.setup();
      open();
      await correctTotal(user, "abc");
      expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    });

    it("is off while the total of the purchase is invalid", async () => {
      const user = userEvent.setup();
      open();
      await user.click(await screen.findByRole("button", { name: "Editar total da nota" }));
      const total = screen.getByLabelText("Total da nota");
      await user.clear(total);
      await user.type(total, "abc");
      await user.click(screen.getByRole("button", { name: "Editar total da nota" }));
      expect(screen.getByRole("button", { name: "Guardar e rever depois" })).toBeDisabled();
    });
  });

  describe("«Eliminar talão»", () => {
    it("asks first, with the confirmation that was already there, and Cancelar changes nothing", async () => {
      let deletes = 0;
      server.use(
        http.delete(`${API}/v1/receipts/r1`, () => {
          deletes += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      open();
      await user.click(await screen.findByRole("button", { name: "Eliminar talão" }));
      expect(screen.getByText("Eliminar esta compra?")).toBeVisible();
      expect(deletes).toBe(0);
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByText("Eliminar esta compra?")).toBeNull();
      expect(screen.getByRole("button", { name: "Eliminar talão" })).toHaveFocus();
      expect(deletes).toBe(0);
    });

    it("deletes after the confirmation and goes back to the list", async () => {
      let deletes = 0;
      server.use(
        http.delete(`${API}/v1/receipts/r1`, () => {
          deletes += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      open();
      await user.click(await screen.findByRole("button", { name: "Eliminar talão" }));
      await user.click(screen.getByRole("button", { name: "Eliminar compra" }));
      expect(await screen.findByText("lista")).toBeInTheDocument();
      expect(deletes).toBe(1);
    });

    it("is the only way to delete while it is under review (no second «Eliminar compra» below)", async () => {
      open();
      await screen.findByRole("button", { name: "Eliminar talão" });
      expect(screen.queryByRole("button", { name: "Eliminar compra" })).toBeNull();
    });

    it("a confirmed purchase keeps «Eliminar compra» in «Ficheiro e dados» and has no review actions", async () => {
      server.use(http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt({ status: "CONFIRMED", review_reasons: [] }))));
      open();
      expect(await screen.findByRole("button", { name: "Eliminar compra" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Eliminar talão" })).toBeNull();
    });
  });

  describe("«Preço alterado de X para Y» with «Desfazer»", () => {
    it("appears after a price is corrected, and says from what to what", async () => {
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      expect(screen.getByText("Preço alterado de 1,70 para 1,90")).toBeVisible();
      expect(screen.getByRole("button", { name: "Desfazer" })).toBeEnabled();
    });

    it("«Desfazer» puts the price back and the line is no longer sent as edited", async () => {
      let patch: { lines: unknown[] } | null = null;
      server.use(
        http.patch(`${API}/v1/receipts/r1`, async ({ request }) => {
          patch = (await request.json()) as { lines: unknown[] };
          return HttpResponse.json(receipt({ version: 4 }));
        }),
      );
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      await user.click(screen.getByRole("button", { name: "Desfazer" }));
      expect(screen.getByLabelText("Preço total (€)")).toHaveValue("1,70");
      expect(screen.queryByText(/Preço alterado de/)).toBeNull();
      await user.selectOptions(screen.getByLabelText("Mercado"), "LIDL"); // something else to save, so a PATCH goes out
      await saveLine(user);
      await user.click(screen.getByRole("button", { name: "Guardar e rever depois" }));
      await waitFor(() => expect(patch).not.toBeNull());
      expect(patch!.lines[0]).toEqual({ id: "l1" });
    });

    it("«Desfazer» takes the purchase back to how it was read: leaving asks nothing and nothing is sent", async () => {
      let patches = 0;
      server.use(
        http.patch(`${API}/v1/receipts/r1`, () => {
          patches += 1;
          return HttpResponse.json(receipt({ version: 4 }));
        }),
      );
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      await user.click(screen.getByRole("button", { name: "Desfazer" }));
      await user.click(screen.getByRole("link", { name: "Voltar às compras" }));
      expect(await screen.findByText("lista")).toBeInTheDocument();
      expect(patches).toBe(0);
    });

    it("«Desfazer» puts back the total and the unit price that moved with it", async () => {
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      expect(screen.getByLabelText("Preço unitário (€)")).toHaveValue("0,95");
      await user.click(screen.getByRole("button", { name: "Desfazer" }));
      expect(screen.getByLabelText("Preço total (€)")).toHaveValue("1,70");
      expect(screen.getByLabelText("Preço unitário (€)")).toHaveValue("0,85");
    });

    it("does not appear when the price is the same, or is not a valid value", async () => {
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,7");
      expect(screen.queryByText(/Preço alterado de/)).toBeNull();
      await correctTotal(user, "abc");
      expect(screen.queryByText(/Preço alterado de/)).toBeNull();
    });

    it("goes away with the line", async () => {
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      await user.click(screen.getByRole("button", { name: "Mais ações da linha" }));
      await user.click(screen.getByRole("button", { name: /remover linha/i }));
      await user.click(screen.getByRole("button", { name: "Remover" }));
      expect(screen.queryByText(/Preço alterado de/)).toBeNull();
    });

    it("gives way to the question of «Eliminar talão» while it is open", async () => {
      const user = userEvent.setup();
      open();
      await correctTotal(user, "1,90");
      await saveLine(user);
      await user.click(screen.getByRole("button", { name: "Eliminar talão" }));
      expect(screen.queryByText(/Preço alterado de/)).toBeNull();
    });
  });
});

describe("Rever talão: sair com alterações por guardar", () => {
  const back = () => screen.getByRole("link", { name: "Voltar às compras" });
  const closeTab = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it("asks before leaving with edits, and «Continuar a editar» keeps the screen and the edit", async () => {
    const user = userEvent.setup();
    open();
    await correctTotal(user, "1,90");
    await user.click(back());
    expect(await screen.findByText("Sair sem guardar as alterações?")).toBeVisible();
    expect(screen.queryByText("lista")).toBeNull();
    expect(screen.queryByText(/Preço alterado de/)).toBeNull(); // the undo bar gives way to the question
    await user.click(screen.getByRole("button", { name: "Continuar a editar" }));
    expect(screen.queryByText("Sair sem guardar as alterações?")).toBeNull();
    expect(screen.getByLabelText("Preço total (€)")).toHaveValue("1,90");
  });

  it("«Sair sem guardar» leaves, and nothing is sent", async () => {
    let patches = 0;
    server.use(
      http.patch(`${API}/v1/receipts/r1`, () => {
        patches += 1;
        return HttpResponse.json(receipt());
      }),
    );
    const user = userEvent.setup();
    open();
    await correctTotal(user, "1,90");
    await user.click(back());
    await user.click(await screen.findByRole("button", { name: "Sair sem guardar" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
    expect(patches).toBe(0);
  });

  it("leaves without asking when nothing was edited", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("link", { name: "Voltar às compras" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
  });

  it("closing the tab with edits asks the browser to confirm; without edits it does not", async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText("Reveja antes de confirmar");
    expect(closeTab()).toBe(false);
    await correctTotal(user, "1,90");
    expect(closeTab()).toBe(true);
  });

  it("deleting the purchase after editing goes to the list without asking again", async () => {
    server.use(http.delete(`${API}/v1/receipts/r1`, () => new HttpResponse(null, { status: 204 })));
    const user = userEvent.setup();
    open();
    await correctTotal(user, "1,90");
    await saveLine(user);
    await user.click(screen.getByRole("button", { name: "Eliminar talão" }));
    await user.click(screen.getByRole("button", { name: "Eliminar compra" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
  });

  it("confirming the purchase after editing saves it first and does not ask", async () => {
    let patched = false;
    server.use(
      http.patch(`${API}/v1/receipts/r1`, () => {
        patched = true;
        return HttpResponse.json(receipt({ version: 4 }));
      }),
      http.post(`${API}/v1/receipts/r1/confirm`, () => HttpResponse.json(receipt({ version: 5, status: "CONFIRMED", review_reasons: [] }))),
    );
    const user = userEvent.setup();
    open();
    await correctTotal(user, "1,90");
    await saveLine(user);
    await user.click(screen.getByRole("button", { name: "Confirmar talão" }));
    await waitFor(() => expect(patched).toBe(true));
    expect(screen.queryByText("Sair sem guardar as alterações?")).toBeNull();
  });
});

describe("Rever talão: espaço para editar", () => {
  const actions = ["Confirmar talão", "Guardar e rever depois", "Eliminar talão"];
  const shown = () => actions.filter((name) => screen.queryByRole("button", { name }));

  it("with a line open the actions of the foot go away, «Desfazer» stays, and «Guardar» brings the foot back", async () => {
    const user = userEvent.setup();
    open();
    await correctTotal(user, "1,90");
    expect(shown()).toEqual([]);
    expect(screen.queryByText("Ao confirmar, os valores entram nos seus gastos.")).toBeNull();
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(shown()).toEqual(actions);
  });

  it("«Cancelar» brings the foot back too", async () => {
    const user = userEvent.setup();
    open();
    await correctTotal(user, "1,90");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(shown()).toEqual(actions);
  });

  it("leaving with the line open still asks «Sair sem guardar as alterações?»", async () => {
    const user = userEvent.setup();
    open();
    await correctTotal(user, "1,90");
    await user.click(screen.getByRole("link", { name: "Voltar às compras" }));
    expect(await screen.findByText("Sair sem guardar as alterações?")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continuar a editar" }));
    expect(screen.getByLabelText("Preço total (€)")).toHaveValue("1,90");
  });

  it("opening the pencil of the date or of the total takes the actions away; closing it brings them back", async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText("Reveja antes de confirmar");
    expect(shown()).toEqual(actions);
    await user.click(screen.getByRole("button", { name: "Editar data e hora" }));
    expect(shown()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Editar data e hora" }));
    expect(shown()).toEqual(actions);
    await user.click(screen.getByRole("button", { name: "Editar total da nota" }));
    expect(shown()).toEqual([]);
  });

  it("a missing date opens by itself, and that alone does not take the actions away", async () => {
    server.use(http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt({ purchase_at: null }))));
    open();
    expect(await screen.findByLabelText("Data")).toBeInTheDocument();
    expect(shown()).toEqual(actions);
  });
});

describe("revertField", () => {
  const line = toDraft(receipt().lines[0]!);

  it("keeps the field touched when it was already", () => {
    const first = setField(line, "line_total", "1,80");
    const second = setField(first, "line_total", "1,90");
    expect(revertField(second, "line_total", "1,80", true).touched).toContain("line_total");
  });
});
