import { Navigate, useLocation } from "react-router";
import { LinkButton, PageHeader } from "../../components/ui";

// The parameters the Resumo reads from its URL (DashboardPage). An old Resumo address carries some of them.
const SUMMARY_PARAMS = ["periodo", "de", "ate", "mercado", "produto", "produto_nome"];

/** Provisional Início until spec 011 replaces it. */
function HomePage() {
  return (
    <>
      <PageHeader title="Início" />
      <div className="flex flex-col items-start gap-3">
        <LinkButton to="/adicionar">Adicionar talão</LinkButton>
        <LinkButton to="/compras/resumo" variant="secondary">
          Ver resumo
        </LinkButton>
      </div>
    </>
  );
}

/** `/`: the Início, or the Resumo when the address still carries Resumo filters. */
export function HomeRoute() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (SUMMARY_PARAMS.some((key) => params.has(key))) {
    return <Navigate to={`/compras/resumo${search}`} replace />;
  }
  return <HomePage />;
}
