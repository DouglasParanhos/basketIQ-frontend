import { Link } from "react-router";
import { Button, LinkButton, SMALL_CAPS, Surface } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { useLogout, useMe } from "../auth/session";
import { PasskeysCard } from "./PasskeysCard";

/** Conta: how the person signed in, «Terminar sessão», the passkeys, the operator panel (operators only) and «Eliminar conta…». */
export function AccountTab() {
  const { data: me } = useMe();
  const logout = useLogout();
  if (!me) return null;

  return (
    <>
      <Surface>
        <h2 className={SMALL_CAPS}>Entrou com</h2>
        <p className="mt-1 text-[15px] font-bold">Google · {me.email}</p>
        <p className="mt-1 text-[13px] text-ink-soft">Conta criada a {formatDate(me.created_at)}.</p>
        <Button variant="outline" className="mt-4 w-full" busy={logout.isPending} onClick={() => logout.mutate()}>
          Terminar sessão
        </Button>
      </Surface>

      <PasskeysCard />

      {me.role === "admin" && (
        <Surface>
          <h2 className="font-bold">Operação</h2>
          <p className="mt-1 text-sm text-ink-soft">Falhas de processamento, métricas e regras por supermercado.</p>
          <Link to="/operador" className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline">
            Abrir painel do operador
          </Link>
        </Surface>
      )}

      <Surface tone="alert">
        <h2 className="text-[15px] font-bold text-alert">Eliminar conta</h2>
        <p className="mt-1 text-[13px] text-ink">Apaga a sua conta e todos os seus dados. Não é possível desfazer.</p>
        <LinkButton to="/definicoes/conta/eliminar" variant="dangerOutline" className="mt-3 w-full">
          Eliminar conta…
        </LinkButton>
      </Surface>
    </>
  );
}
