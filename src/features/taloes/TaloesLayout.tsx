import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { Spinner } from "../../components/ui";
import { YearSelect } from "./YearSelect";

// The tab ids are the paths: each tab goes to its plain path (the Resumo filters live in its own URL).
const TABS = [
  { id: "/compras", label: "Compras" },
  { id: "/compras/resumo", label: "Resumo" },
  { id: "/produtos", label: "Produtos" },
];

/** The title «Talões» and the tabs Compras · Resumo · Produtos above the page; the year only where it does something (Compras). The detail pages sit outside this layout. */
export function TaloesLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const path = pathname.replace(/(.)\/$/, "$1");
  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-6">
        <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight">Talões</h1>
        {path === "/compras" && <YearSelect />}
      </div>
      <div className="pt-3">
        <SegmentedTabs label="Talões" tabs={TABS} value={path} onChange={navigate} />
      </div>
      {/* Produtos is a lazy chunk: only the body waits, the tabs stay. */}
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </>
  );
}
