import { Fingerprint } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Schemas } from "../../api/client";
import { Button, Notice, Spinner, Surface } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { addPasskeyError, useAddPasskey, usePasskeySupport, usePasskeys, useRemovePasskey } from "../auth/passkeys";

/** One passkey: its dates and «Remover», with a confirmation that takes the focus (as in PrivacyTab). */
function PasskeyRow({ passkey }: { passkey: Schemas["PasskeyOut"] }) {
  const remove = useRemovePasskey();
  const [confirming, setConfirming] = useState(false);
  const confirmTitle = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (confirming) confirmTitle.current?.focus();
  }, [confirming]);

  return (
    <li className="flex flex-col gap-2 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Fingerprint aria-hidden className="size-5 shrink-0 text-ink-soft" />
          <div>
            <p className="text-[13px] font-semibold">Passkey criada a {formatDate(passkey.created_at)}</p>
            <p className="text-[12px] text-ink-soft">{passkey.last_used_at ? `Último uso a ${formatDate(passkey.last_used_at)}` : "Ainda não usada"}</p>
          </div>
        </div>
        {!confirming && (
          <Button variant="dangerQuiet" size="sm" className="shrink-0" onClick={() => setConfirming(true)}>
            Remover
          </Button>
        )}
      </div>
      {confirming && (
        <>
          <Notice tone="warning">
            <p ref={confirmTitle} tabIndex={-1} className="font-semibold">
              Remover esta passkey?
            </p>
            <p className="mt-1">Deixa de poder entrar com ela. Pode sempre entrar com Google.</p>
          </Notice>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" busy={remove.isPending} onClick={() => remove.mutate(passkey.id)}>
              Remover passkey
            </Button>
            <Button variant="quiet" disabled={remove.isPending} onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </>
      )}
      {remove.isError && <Notice tone="error">Não foi possível remover a passkey. Tente novamente.</Notice>}
    </li>
  );
}

/** Conta › «Entrar com passkey» (RF-01): the passkeys of the account, «Adicionar passkey» on a phone that can, and «Remover». */
export function PasskeysCard() {
  const supported = usePasskeySupport();
  const list = usePasskeys();
  const { ready, mutation: add } = useAddPasskey(supported);
  const addError = addPasskeyError(add.error);

  return (
    <Surface>
      <h2 className="text-[15px] font-bold">Entrar com passkey</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Entre com a digital, o rosto ou o PIN do telemóvel, sem passar pela Google. A digital nunca sai do telemóvel.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {list.isLoading && <Spinner />}
        {list.isError && (
          <Notice
            tone="warning"
            title="Não foi possível carregar as passkeys."
            action={
              <Button variant="secondary" onClick={() => void list.refetch()}>
                Tentar de novo
              </Button>
            }
          />
        )}
        {!!list.data?.length && (
          <ul className="divide-y divide-line">
            {list.data.map((passkey) => (
              <PasskeyRow key={passkey.id} passkey={passkey} />
            ))}
          </ul>
        )}
        {supported ? (
          <Button variant="secondary" className="w-full" disabled={!ready} busy={add.isPending} onClick={() => add.mutate()}>
            Adicionar passkey neste telemóvel
          </Button>
        ) : (
          <p className="text-[13px] text-ink-soft">Este dispositivo não permite criar passkeys.</p>
        )}
        {addError && <Notice tone="error">{addError}</Notice>}
      </div>
    </Surface>
  );
}
