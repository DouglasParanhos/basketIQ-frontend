import { Link } from "react-router";
import { Button, LinkButton, Surface } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { useLogout, useMe } from "../auth/session";

/** Conta: how the person signed in, «Terminar sessão», the operator panel (operators only) and «Eliminar conta…». */
export function AccountTab() {
  const { data: me } = useMe();
  const logout = useLogout();
  if (!me) return null;

  return (
    <>
      <Surface>
        <h2 className="font-bold">Sessão</h2>
        <p className="mt-1">Entrou com Google · {me.email}</p>
        <p className="mt-1 text-sm text-ink-soft">Conta criada a {formatDate(me.created_at)}.</p>
        <Button variant="secondary" className="mt-4" busy={logout.isPending} onClick={() => logout.mutate()}>
          Terminar sessão
        </Button>
      </Surface>

      {me.role === "admin" && (
        <Surface>
          <h2 className="font-bold">Operação</h2>
          <p className="mt-1 text-sm text-ink-soft">Falhas de processamento, métricas e regras por supermercado.</p>
          <Link to="/operador" className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline">
            Abrir painel do operador
          </Link>
        </Surface>
      )}

      <Surface>
        <h2 className="font-bold">Eliminar conta</h2>
        <p className="mt-1 text-sm text-ink-soft">Apaga a sua conta e todos os seus dados. Não é possível desfazer.</p>
        <LinkButton to="/definicoes/conta/eliminar" variant="dangerQuiet" className="mt-3">
          Eliminar conta…
        </LinkButton>
      </Surface>
    </>
  );
}
