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
      {/* The list of purchases lies on a desk, behind the whole screen: the desk comes first and the content is positioned, so it paints above it (a negative z-index would go behind the background of the shell). */}
      {path === "/compras" && <div aria-hidden className="fixed inset-0 bg-table" />}
      <div className="relative flex items-center justify-between gap-3 pt-6 print:hidden">
        <h1 className="font-display text-[length:calc(1.75rem_*_var(--text-scale))] font-semibold leading-tight">Talões</h1>
        {path === "/compras" && <YearSelect />}
      </div>
      <div className="relative pt-3 print:hidden">
        <SegmentedTabs label="Talões" tabs={TABS} value={path} onChange={navigate} />
      </div>
      {/* Produtos is a lazy chunk: only the body waits, the tabs stay. */}
      <div className="relative">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </div>
    </>
  );
}
