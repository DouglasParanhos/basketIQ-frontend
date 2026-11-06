import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { api, unwrap } from "../../api/client";
import { Button, Notice } from "../../components/ui";
import { useLogout, useMe } from "../auth/session";

// The third line says «depois de confirmar o talão», not «ao fim de 30 dias» as in the canvas: the backend only schedules the erasure in `mark_confirmed`.
const SUMMARY = [
  "Guardamos o seu nome, o e-mail e os dados dos seus talões.",
  "Usamos só para lhe mostrar as suas compras. Não vendemos nem partilhamos.",
  "Os ficheiros originais são apagados 30 dias depois de confirmar o talão. Pode apagar tudo quando quiser.",
];

// The full policy: the text that was already here (the owner writes the final text), under the titles of the design.
const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Que dados guardamos",
    body: "Da sua conta Google: identificador, nome e e-mail. Das notas: o ficheiro original e os dados extraídos (supermercado, data, produtos, quantidades, preços, descontos e totais). Se ativar a entrada com passkey: a chave pública e as datas de criação e de último uso. A digital, o rosto e o PIN nunca saem do telemóvel.",
  },
  { title: "Para que servem", body: "Apenas para lhe mostrar as suas compras e análises. Não partilhamos nem vendemos dados." },
  {
    title: "Onde são processados os talões",
    body: "A leitura das notas é feita nos nossos servidores, com reconhecimento de texto local. As notas não são enviadas a serviços externos. Se no futuro um serviço externo for usado para notas difíceis, só acontecerá dentro desta política e ficará registado.",
  },
  {
    title: "Durante quanto tempo",
    body: "O ficheiro original é apagado automaticamente 30 dias depois de confirmar a compra. Pode apagá-lo antes, mantendo os dados da compra. Os dados das compras ficam enquanto mantiver a conta.",
  },
  {
    title: "Os seus direitos",
    body: "Pode apagar uma compra, apenas o ficheiro original ou a conta inteira em Definições. A eliminação da conta remove notas, ficheiros e dados de compras.",
  },
];

/** One row of the accordion: a button (Enter and Space work as on any button) that shows or hides its text. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-t border-line">
      <h3>
        <button
          type="button"
          id={`${id}-title`}
          aria-expanded={open}
          aria-controls={`${id}-text`}
          onClick={() => setOpen(!open)}
          className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-[15px] font-bold"
        >
          {title}
          <ChevronDown aria-hidden strokeWidth={2} className={`size-[18px] shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h3>
      <div id={`${id}-text`} role="region" aria-labelledby={`${id}-title`} hidden={!open} className="pb-4 text-[15px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function PrivacyPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const logout = useLogout();
  const accept = useMutation({
    mutationFn: async () => unwrap(await api.POST("/v1/me/privacy-consent")),
    onSuccess: (updated) => {
      qc.setQueryData(["me"], updated);
      navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true });
    },
  });
  const needsConsent = me && (!me.privacy_accepted_at || me.privacy_version !== me.current_privacy_version);
  const busy = accept.isPending || logout.isPending;

  return (
    <main className={`mx-auto max-w-2xl px-6 pt-12 ${needsConsent ? "pb-[calc(11rem+env(safe-area-inset-bottom))]" : "pb-16"}`}>
      <h1 className="font-display text-[30px] font-semibold leading-[1.1]">Política de privacidade</h1>

      <section aria-labelledby="resumo" className="mt-4 flex flex-col gap-3 rounded-[20px] bg-brand-soft p-4">
        <h2 id="resumo" className="text-[11px] font-normal tracking-[0.1em] text-ink-soft">
          EM RESUMO
        </h2>
        <ul className="flex flex-col gap-3">
          {SUMMARY.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <Check aria-hidden strokeWidth={2.6} className="mt-0.5 size-5 shrink-0 text-brand" />
              <span className="text-[15px] leading-[1.45]">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="completa" className="mt-4">
        <h2 id="completa" className="mb-1.5 text-[11px] font-normal tracking-[0.1em] text-ink-soft">
          POLÍTICA COMPLETA
        </h2>
        {SECTIONS.map(({ title, body }) => (
          <Section key={title} title={title}>
            {body}
          </Section>
        ))}
      </section>

      {needsConsent && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ground">
          <div className="mx-auto flex min-h-[163px] max-w-2xl flex-col gap-2 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
            {accept.error && <Notice tone="error">{accept.error.message}</Notice>}
            <Button size="lg" className="w-full rounded-[28px] font-extrabold" busy={accept.isPending} disabled={busy} onClick={() => accept.mutate()}>
              Li a política e continuar
            </Button>
            <Button variant="ghost" className="w-full text-[15px] font-bold" disabled={busy} onClick={() => logout.mutate()}>
              Sair
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
