import { House, ListChecks, Plus, ReceiptText, SlidersVertical } from "lucide-react";
import { createContext, Suspense, useContext, useLayoutEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useSmartListEnabled } from "../config/appConfig";
import { Spinner } from "./ui";

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

// `also`: other roots that keep the destination active (Talões covers /produtos too).
const ITEMS = [
  { to: "/", label: "Início", icon: House },
  { to: "/compras", also: ["/produtos"], label: "Talões", icon: ReceiptText },
  { to: "/adicionar", label: "Adicionar talão", icon: Plus, primary: true },
  { to: "/lista", label: "Lista", icon: ListChecks, requiresSmartList: true },
  { to: "/definicoes", label: "Definições", icon: SlidersVertical },
];

const NavContext = createContext<{ hidden: boolean; setHidden: (hidden: boolean) => void }>({ hidden: false, setHidden: () => undefined });

/** True while a full screen has taken the bar away: what else surrounds the page (the tabs of Definições) goes too. */
export const useNavHidden = () => useContext(NavContext).hidden;

/** A full screen (the parts of a receipt, editing the profile, deleting the account) takes the bar away while it is on screen. */
export function useHideNav() {
  const { setHidden } = useContext(NavContext);
  useLayoutEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);
}

export function AppShell() {
  const { pathname } = useLocation();
  const smartList = useSmartListEnabled();
  const [navHidden, setNavHidden] = useState(false);
  const nav = useMemo(() => ({ hidden: navHidden, setHidden: setNavHidden }), [navHidden]);
  const items = ITEMS.filter((item) => smartList || !item.requiresSmartList);
  return (
    <div className={`min-h-dvh ${navHidden ? "" : "md:grid md:grid-cols-[5.5rem_1fr]"}`}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:p-3">
        Saltar para o conteúdo
      </a>
      {!navHidden && (
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
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] ${isActive ? "font-bold text-ink" : "font-medium text-ink-soft"}`}
                  >
                    {primary ? (
                      <span className="-mt-[22px] grid size-14 place-items-center rounded-full bg-brand text-white shadow-[0_6px_16px_rgb(0_0_0/0.3)] dark:text-ground md:mt-0">
                        <Icon aria-hidden className="size-6" strokeWidth={2.4} />
                      </span>
                    ) : (
                      <Icon aria-hidden className="size-[22px]" strokeWidth={1.8} />
                    )}
                    <span className={primary ? "sr-only md:not-sr-only" : undefined}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <main id="conteudo" className={`mx-auto w-full max-w-2xl px-5 ${navHidden ? "" : "pb-28 md:pb-12"}`}>
        <NavContext.Provider value={nav}>
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </NavContext.Provider>
      </main>
    </div>
  );
}
