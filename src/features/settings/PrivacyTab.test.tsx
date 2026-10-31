import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { routes } from "../../App";
import { formatDate } from "../../lib/format";
import { me } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server, serveStoredFiles, serveStoredFilesDelete } from "../../test/server";

const deleted = (receipts: number, remaining: number) => ({ files_deleted: receipts * 3, receipts, remaining });

async function openPrivacy() {
  const view = { ...renderRoutes(routes, "/definicoes/privacidade"), user: userEvent.setup() };
  await screen.findByRole("heading", { level: 2, name: "Política de privacidade" });
  return view;
}
const press = (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) => user.click(screen.getByRole("button", { name }));

describe("privacy tab (spec 014, US3)", () => {
  it("F-191: shows the policy the person accepted, with the real version and date, and a link to read it", async () => {
    await openPrivacy();
    expect(screen.getByText(`Aceite a ${formatDate(me.privacy_accepted_at)} · versão ${me.privacy_version}`)).toBeInTheDocument();
    expect(screen.queryByText(/versão 1\.0/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ler a política" })).toHaveAttribute("href", "/privacidade");
  });

  it("F-191: says the originals are deleted 30 days after confirming and that the values stay", async () => {
    await openPrivacy();
    expect(screen.getByText("Originais dos talões")).toBeInTheDocument();
    expect(
      screen.getByText("Os ficheiros (fotos e PDF) são apagados automaticamente 30 dias depois de confirmar a compra. Os valores ficam nas suas contas."),
    ).toBeInTheDocument();
  });

  it("F-191: counts the stored files, with the singular, and offers «Apagar agora»", async () => {
    serveStoredFiles(9);
    const first = await openPrivacy();
    expect(await screen.findByText("9 ficheiros guardados agora")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apagar agora" })).toBeEnabled();
    first.unmount();
    serveStoredFiles(1);
    await openPrivacy();
    expect(await screen.findByText("1 ficheiro guardado agora")).toBeInTheDocument();
  });

  it("F-191: «Apagar agora» only opens a confirmation that says what stays and what goes", async () => {
    const calls = serveStoredFilesDelete([deleted(3, 0)]);
    const { user } = await openPrivacy();
    await user.click(await screen.findByRole("button", { name: "Apagar agora" }));
    expect(screen.getByRole("heading", { name: "Apagar os ficheiros originais?" })).toBeInTheDocument();
    expect(screen.getByText(/As compras e os valores ficam\. As fotos e os PDF desaparecem e não é possível recuperá-los\./)).toBeInTheDocument();
    expect(calls.count).toBe(0);
    await press(user, "Cancelar");
    expect(screen.queryByRole("heading", { name: "Apagar os ficheiros originais?" })).not.toBeInTheDocument();
    expect(calls.count).toBe(0);
  });

  it("F-191: confirming repeats the delete until nothing remains, ends at «Nenhum ficheiro guardado» and refreshes the purchases", async () => {
    let files = 1500;
    server.use(http.get(`${API}/v1/receipts/stored-files`, () => HttpResponse.json({ files })));
    const calls = serveStoredFilesDelete([deleted(500, 700), deleted(500, 200), deleted(200, 0)]);
    const { user, client } = await openPrivacy();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await user.click(await screen.findByRole("button", { name: "Apagar agora" }));
    files = 0;
    await press(user, "Apagar ficheiros");
    expect(await screen.findByText("Nenhum ficheiro guardado")).toBeInTheDocument();
    expect(calls.count).toBe(3);
    expect(screen.getByRole("button", { name: "Apagar agora" })).toBeDisabled();
    for (const queryKey of [["stored-files"], ["receipts"], ["receipt"]]) expect(invalidate).toHaveBeenCalledWith({ queryKey });
  });

  it("F-191: with no files it says so and the button is off", async () => {
    serveStoredFiles(0);
    await openPrivacy();
    expect(await screen.findByText("Nenhum ficheiro guardado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apagar agora" })).toBeDisabled();
  });

  it("F-191: a failure half-way says how many purchases are left and «Tentar de novo» goes on", async () => {
    const calls = serveStoredFilesDelete([deleted(500, 700), "error", deleted(500, 0)]);
    const { user } = await openPrivacy();
    await user.click(await screen.findByRole("button", { name: "Apagar agora" }));
    await press(user, "Apagar ficheiros");
    expect(await screen.findByText("Não foi possível apagar tudo. Faltam 700 compras.")).toBeInTheDocument();
    expect(calls.count).toBe(2);
    await press(user, "Tentar de novo");
    await waitFor(() => expect(calls.count).toBe(3));
    expect(screen.queryByText(/Não foi possível apagar tudo/)).not.toBeInTheDocument();
  });

  it("F-191: an answer with no progress stops instead of repeating for ever", async () => {
    const calls = serveStoredFilesDelete([deleted(0, 5)]);
    const { user } = await openPrivacy();
    await user.click(await screen.findByRole("button", { name: "Apagar agora" }));
    await press(user, "Apagar ficheiros");
    expect(await screen.findByText("Não foi possível apagar tudo. Faltam 5 compras.")).toBeInTheDocument();
    expect(calls.count).toBe(1);
  });

  it("F-191: «Os seus direitos» is there", async () => {
    await openPrivacy();
    expect(screen.getByRole("heading", { name: "Os seus direitos" })).toBeInTheDocument();
    expect(screen.getByText(/Pode ver e apagar compras uma a uma, apagar só o ficheiro original ou eliminar a conta inteira quando quiser\./)).toBeInTheDocument();
  });

  it("F-191: the count loading shows the indicator and failing shows an error with «Tentar de novo», never a number", async () => {
    server.use(http.get(`${API}/v1/receipts/stored-files`, () => HttpResponse.json(errorBody("internal_error", "x"), { status: 500 })));
    await openPrivacy();
    expect(await screen.findByText("Não foi possível carregar os ficheiros guardados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.queryByText(/ficheiros? guardados? agora/)).not.toBeInTheDocument();
  });
});
