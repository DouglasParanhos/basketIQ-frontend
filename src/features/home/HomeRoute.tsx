import { Navigate, useLocation } from "react-router";
import { HomePage } from "./HomePage";

// The parameters the Resumo reads from its URL (DashboardPage). An old Resumo address carries some of them.
const SUMMARY_PARAMS = ["periodo", "de", "ate", "mercado", "produto", "produto_nome"];

/** `/`: the Início, or the Resumo when the address still carries Resumo filters. */
export function HomeRoute() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (SUMMARY_PARAMS.some((key) => params.has(key))) {
    return <Navigate to={`/compras/resumo${search}`} replace />;
  }
  return <HomePage />;
}
