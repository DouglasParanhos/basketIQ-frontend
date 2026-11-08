import { useState } from "react";
import { Link } from "react-router";
import { Button, Notice, Spinner, Surface } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { useConfirmFocus } from "../../lib/useConfirmFocus";
import { useMe } from "../auth/session";
import { DeleteIncomplete, useDeleteStoredFiles, useStoredFiles } from "./useStoredFiles";

/** Privacidade: the policy accepted, the originals (count and «Apagar agora») and the person's rights. */
export function PrivacyTab() {
  const { data: me } = useMe();
  const files = useStoredFiles();
  const remove = useDeleteStoredFiles();
  const [confirming, setConfirming] = useState(false);
  const confirmTitle = useConfirmFocus<HTMLHeadingElement>(confirming);
  if (!me) return null;

  const count = files.data?.files;
  const left = remove.error instanceof DeleteIncomplete ? remove.error.remaining : null;

  return (
    <>
      <Surface>
        <h2 className="text-[15px] font-bold">Política de privacidade</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Aceite a {formatDate(me.privacy_accepted_at)} · versão {me.privacy_version}
        </p>
        <Link to="/privacidade" className="mt-2 inline-flex min-h-11 items-center font-bold text-brand">
          Ler a política
        </Link>
      </Surface>

      <Surface>
        <h2 className="text-[15px] font-bold">Originais dos talões</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Os ficheiros (fotos e PDF) são apagados automaticamente 30 dias depois de confirmar a compra. Os valores ficam nas suas contas.
        </p>
        <div className="mt-3">
          {files.isLoading ? (
            <Spinner />
          ) : files.isError || count === undefined ? (
            <Notice
              tone="warning"
              title="Não foi possível carregar os ficheiros guardados."
              action={
                <Button variant="secondary" onClick={() => files.refetch()}>
                  Tentar de novo
                </Button>
              }
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold">{count === 0 ? "Nenhum ficheiro guardado" : `${count} ${count === 1 ? "ficheiro guardado" : "ficheiros guardados"} agora`}</p>
              {!confirming && (
                <Button variant="outline" size="sm" className="shrink-0" disabled={!count || remove.isPending} onClick={() => setConfirming(true)}>
                  Apagar agora
                </Button>
              )}
            </div>
          )}
        </div>
        {remove.isError && (
          <div className="mt-3">
            <Notice
              tone="error"
              title={`Não foi possível apagar tudo.${left ? ` Faltam ${left} ${left === 1 ? "compra" : "compras"}.` : ""}`}
              action={
                <Button variant="secondary" onClick={() => remove.mutate()}>
                  Tentar de novo
                </Button>
              }
            />
          </div>
        )}
        {confirming ? (
          <div className="mt-3 flex flex-col gap-3">
            <Notice tone="warning">
              <h3 ref={confirmTitle} tabIndex={-1} className="font-semibold">
                Apagar os ficheiros originais?
              </h3>
              <p className="mt-1">As compras e os valores ficam. As fotos e os PDF desaparecem e não é possível recuperá-los.</p>
            </Notice>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                busy={remove.isPending}
                onClick={() => remove.mutate(undefined, { onSettled: () => setConfirming(false) })}
              >
                {remove.isPending ? "A apagar…" : "Apagar ficheiros"}
              </Button>
              <Button variant="quiet" disabled={remove.isPending} onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </Surface>

      <Surface>
        <h2 className="text-[15px] font-bold">Os seus direitos</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Pode ver e apagar compras uma a uma, apagar só o ficheiro original ou eliminar a conta inteira quando quiser.
        </p>
      </Surface>
    </>
  );
}
