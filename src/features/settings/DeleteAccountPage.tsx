import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { api, unwrap } from "../../api/client";
import { FullScreen } from "../../components/FullScreen";
import { AcknowledgeBox, Button, LinkButton, Notice, ROUND_NEUTRAL, Surface } from "../../components/ui";

const LOST = [
  "Todas as compras e talões lidos",
  "Os ficheiros originais guardados",
  "O seu perfil, a meta e as preferências",
  "O acesso com esta conta Google",
  "As passkeys registadas",
];

/** Eliminar conta, on a screen of its own: what disappears, a box to tick and the final button. Same request as before. */
export function DeleteAccountPage() {
  const qc = useQueryClient();
  const [understood, setUnderstood] = useState(false);
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/v1/me")),
    onSuccess: () => {
      qc.clear();
      window.location.assign("/login");
    },
  });

  return (
    <FullScreen
      title="Eliminar conta"
      start={
        <Link to="/definicoes/conta" aria-label="Voltar" className={ROUND_NEUTRAL}>
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
      }
      footer={
        <>
          <Button variant="danger" size="lg" className="w-full" disabled={!understood} busy={remove.isPending} onClick={() => remove.mutate()}>
            Eliminar a minha conta
          </Button>
          <LinkButton to="/definicoes/conta" variant="ghost" className="w-full">
            Cancelar
          </LinkButton>
        </>
      }
    >
      <Notice tone="warning" title="Isto não pode ser desfeito">
        Vamos apagar tudo o que está ligado à sua conta. A sessão termina em todos os dispositivos.
      </Notice>
      <Surface tone="bordered" dense>
        <h2 className="sr-only">O que desaparece</h2>
        <ul className="divide-y divide-line">
          {LOST.map((item) => (
            <li key={item} className="flex items-center gap-3 py-2.5 text-sm">
              <X aria-hidden className="size-[18px] shrink-0 text-alert" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
      </Surface>
      <AcknowledgeBox checked={understood} onChange={setUnderstood}>
        Compreendo que os meus dados serão eliminados e que não é possível recuperá-los.
      </AcknowledgeBox>
      {remove.error && <Notice tone="error">{remove.error.message}</Notice>}
    </FullScreen>
  );
}
