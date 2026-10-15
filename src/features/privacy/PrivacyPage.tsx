import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { api, unwrap } from "../../api/client";
import { Button, Notice } from "../../components/ui";
import { useMe } from "../auth/session";

export function PrivacyPolicy() {
  return (
    <div className="flex flex-col gap-5 leading-relaxed">
      <section>
        <h2 className="text-lg font-bold">Que dados guardamos</h2>
        <p>
          Da sua conta Google: identificador, nome e e-mail. Das notas: o ficheiro original e os dados extraídos (supermercado, data,
          produtos, quantidades, preços, descontos e totais).
        </p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Para que servem</h2>
        <p>Apenas para lhe mostrar as suas compras e análises. Não partilhamos nem vendemos dados.</p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Onde são processadas as notas</h2>
        <p>
          A leitura das notas é feita nos nossos servidores, com reconhecimento de texto local. As notas não são enviadas a serviços
          externos. Se no futuro um serviço externo for usado para notas difíceis, só acontecerá dentro desta política e ficará
          registado.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Durante quanto tempo</h2>
        <p>
          O ficheiro original é apagado automaticamente 30 dias depois de confirmar a compra. Pode apagá-lo antes, mantendo os dados da
          compra. Os dados das compras ficam enquanto mantiver a conta.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Os seus direitos</h2>
        <p>
          Pode apagar uma compra, apenas o ficheiro original ou a conta inteira em Definições. A eliminação da conta remove notas,
          ficheiros e dados de compras.
        </p>
      </section>
    </div>
  );
}

export function PrivacyPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const accept = useMutation({
    mutationFn: async () => unwrap(await api.POST("/v1/me/privacy-consent")),
    onSuccess: (updated) => {
      qc.setQueryData(["me"], updated);
      navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true });
    },
  });
  const needsConsent = me && (!me.privacy_accepted_at || me.privacy_version !== me.current_privacy_version);

  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-10">
      <h1 className="mb-6 text-[2rem] font-extrabold leading-tight tracking-tight">Política de privacidade</h1>
      <PrivacyPolicy />
      {needsConsent && (
        <div className="sticky bottom-0 mt-8 flex flex-col gap-3 bg-ground py-4">
          {accept.error && <Notice tone="error">{accept.error.message}</Notice>}
          <Button busy={accept.isPending} onClick={() => accept.mutate()}>
            Aceitar e continuar
          </Button>
        </div>
      )}
    </main>
  );
}
