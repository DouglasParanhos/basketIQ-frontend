import { ChartPie, Plus, ReceiptText, Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router";

const ITEMS = [
  { to: "/", label: "Resumo", icon: ChartPie, end: true },
  { to: "/compras", label: "Compras", icon: ReceiptText, end: false },
  { to: "/adicionar", label: "Adicionar", icon: Plus, end: false, primary: true },
  { to: "/definicoes", label: "Definições", icon: Settings, end: false },
];

export function AppShell() {
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
          {ITEMS.map(({ to, label, icon: Icon, end, primary }) => (
            <li key={to} className="flex-1 md:flex-none">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                    isActive ? "text-brand" : "text-ink-soft",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
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
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="conteudo" className="mx-auto w-full max-w-2xl px-4 pb-28 md:pb-12">
        <Outlet />
      </main>
    </div>
  );
}
