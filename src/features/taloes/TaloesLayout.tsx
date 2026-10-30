import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { Spinner } from "../../components/ui";

// The tab ids are the paths: each tab goes to its plain path (the Resumo filters live in its own URL).
const TABS = [
  { id: "/compras", label: "Compras" },
  { id: "/compras/resumo", label: "Resumo" },
  { id: "/produtos", label: "Produtos" },
];

/** Compras · Resumo · Produtos tabs above the page. The detail pages sit outside this layout. */
export function TaloesLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <div className="pt-4">
        <SegmentedTabs label="Talões" tabs={TABS} value={pathname.replace(/(.)\/$/, "$1")} onChange={navigate} />
      </div>
      {/* Produtos is a lazy chunk: only the body waits, the tabs stay. */}
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </>
  );
}
