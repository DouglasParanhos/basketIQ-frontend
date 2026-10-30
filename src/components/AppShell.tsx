import { House, ListChecks, Plus, ReceiptText, Settings } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router";
import { useSmartListEnabled } from "../config/appConfig";

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

// `also`: other roots that keep the destination active (Talões covers /produtos too).
const ITEMS = [
  { to: "/", label: "Início", icon: House },
  { to: "/compras", also: ["/produtos"], label: "Talões", icon: ReceiptText },
  { to: "/adicionar", label: "Adicionar", icon: Plus, primary: true },
  { to: "/lista", label: "Lista", icon: ListChecks, requiresSmartList: true },
  { to: "/definicoes", label: "Definições", icon: Settings },
];

export function AppShell() {
  const { pathname } = useLocation();
  const smartList = useSmartListEnabled();
  const items = ITEMS.filter((item) => smartList || !item.requiresSmartList);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[5.5rem_1fr]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:p-3">
        Saltar para o conteúdo
      </a>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:h-dvh md:border-r md:border-t-0"
      >
        <ul className="mx-auto flex max-w-xl items-stretch justify-around md:h-full md:flex-col md:justify-start md:gap-2 md:pt-6">
          {items.map(({ to, also, label, icon: Icon, primary }) => {
            const isActive = [to, ...(also ?? [])].some((base) => under(pathname, base));
            return (
              <li key={to} className="flex-1 md:flex-none">
                <Link
                  to={to}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? "text-brand" : "text-ink-soft"}`}
                >
                  <span
                    className={
                      primary
                        ? "grid size-11 place-items-center rounded-full bg-brand text-white shadow-md dark:text-ground"
                        : `grid h-8 w-14 place-items-center rounded-full ${isActive ? "bg-brand-soft" : ""}`
                    }
                  >
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main id="conteudo" className="mx-auto w-full max-w-2xl px-4 pb-28 md:pb-12">
        <Outlet />
      </main>
    </div>
  );
}
