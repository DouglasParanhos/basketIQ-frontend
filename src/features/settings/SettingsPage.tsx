import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { api, unwrap } from "../../api/client";
import { Button, Notice, PageHeader, Surface } from "../../components/ui";
import { useAppName } from "../../config/appConfig";
import { formatDate } from "../../lib/format";
import { useLogout, useMe } from "../auth/session";

export function SettingsPage() {
  const { data: me } = useMe();
  const appName = useAppName();
  const logout = useLogout();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/v1/me")),
    onSuccess: () => {
      qc.clear();
      window.location.assign("/login");
    },
  });
  if (!me) return null;

  return (
    <>
      <PageHeader title="Definições" />
      <div className="flex flex-col gap-4">
        <Surface>
          <h2 className="font-bold">Conta</h2>
          <p className="mt-1">{me.display_name}</p>
          <p className="text-sm text-ink-soft">{me.email}</p>
          <p className="mt-2 text-sm text-ink-soft">Entrada com Google. Conta criada a {formatDate(me.created_at)}.</p>
          <Button variant="secondary" className="mt-4" busy={logout.isPending} onClick={() => logout.mutate()}>
            Terminar sessão
          </Button>
        </Surface>

        <Surface>
          <h2 className="font-bold">Privacidade</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Política aceite a {formatDate(me.privacy_accepted_at)}. Os ficheiros originais das notas são apagados 30 dias depois de
            confirmar cada compra.
          </p>
          <Link to="/privacidade" className="mt-3 inline-flex min-h-11 items-center font-semibold text-cobalt underline">
            Ler a política de privacidade
          </Link>
        </Surface>

        {me.role === "admin" && (
          <Surface>
            <h2 className="font-bold">Operação</h2>
            <p className="mt-1 text-sm text-ink-soft">Falhas de processamento, métricas e regras por supermercado.</p>
            <Link to="/operador" className="mt-3 inline-flex min-h-11 items-center font-semibold text-cobalt underline">
              Abrir painel do operador
            </Link>
          </Surface>
        )}

        <Surface>
          <h2 className="font-bold">Eliminar conta</h2>
          {!confirmDelete ? (
            <>
              <p className="mt-1 text-sm text-ink-soft">Remove a conta e todos os dados associados.</p>
              <Button variant="dangerQuiet" className="mt-3" onClick={() => setConfirmDelete(true)}>
                Eliminar conta
              </Button>
            </>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <Notice tone="warning" title="Isto não pode ser desfeito">
                São apagadas imediatamente todas as compras, linhas, produtos que criou e ficheiros originais. A sessão termina em todos
                os dispositivos.
              </Notice>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" className="size-5 accent-alert" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
                Compreendo que os meus dados serão apagados.
              </label>
              {remove.error && <Notice tone="error">{remove.error.message}</Notice>}
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" disabled={!understood} busy={remove.isPending} onClick={() => remove.mutate()}>
                  Eliminar conta e dados
                </Button>
                <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Surface>
        <p className="text-center text-xs text-ink-soft">{appName} {__APP_VERSION__}</p>
      </div>
    </>
  );
}
