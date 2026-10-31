import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, unwrap } from "../../api/client";
import { Button, LinkButton, Notice, PageHeader, Surface } from "../../components/ui";

const LOST = [
  "Todas as compras e talões lidos",
  "Os ficheiros originais guardados",
  "O seu perfil, a meta e as preferências",
  "O acesso com esta conta Google",
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
    <>
      <PageHeader title="Eliminar conta" />
      <div className="flex flex-col gap-4">
        <Notice tone="warning" title="Isto não pode ser desfeito">
          Vamos apagar tudo o que está ligado à sua conta. A sessão termina em todos os dispositivos.
        </Notice>
        <Surface>
          <h2 className="font-bold">O que desaparece</h2>
          <ul className="mt-2 divide-y divide-line">
            {LOST.map((item) => (
              <li key={item} className="py-2">
                {item}
              </li>
            ))}
          </ul>
        </Surface>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-alert" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          Compreendo que os meus dados serão eliminados e que não é possível recuperá-los.
        </label>
        {remove.error && <Notice tone="error">{remove.error.message}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={!understood} busy={remove.isPending} onClick={() => remove.mutate()}>
            Eliminar a minha conta
          </Button>
          <LinkButton to="/definicoes/conta" variant="quiet">
            Cancelar
          </LinkButton>
        </div>
      </div>
    </>
  );
}
