import { Plus } from "lucide-react";
import { createContext, Suspense, useContext, useLayoutEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useSmartListEnabled } from "../config/appConfig";
import { Spinner } from "./ui";

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

// `also`: other roots that keep the destination active (Talões covers /produtos too).
// `icon`: the strokes of the approved design (canvas NavBar): a house, a receipt, three lines with dots, three sliders.
const ITEMS = [
  { to: "/", label: "Início", icon: "M3 11l9-8 9 8M5 10v10h14V10" },
  { to: "/compras", also: ["/produtos"], label: "Talões", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" },
  { to: "/adicionar", label: "Adicionar talão", primary: true },
  { to: "/lista", label: "Lista", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", requiresSmartList: true },
  { to: "/definicoes", label: "Definições", icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" },
];

function NavIcon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" className="size-6">
      <path d={path} />
    </svg>
  );
}

const NavContext = createContext<{ hidden: boolean; setHidden: (hidden: boolean) => void }>({ hidden: false, setHidden: () => undefined });

/** True while a full screen has taken the bar away: what else surrounds the page (the tabs of Definições) goes too. */
export const useNavHidden = () => useContext(NavContext).hidden;

/**
 * A full screen (the parts of a receipt, editing the profile, deleting the account) takes the bar away while it is on screen.
 * `active` lets a screen take it away only while something is being edited, when the keyboard needs the room.
 */
export function useHideNav(active = true) {
  const { setHidden } = useContext(NavContext);
  useLayoutEffect(() => {
    if (!active) return;
    setHidden(true);
    return () => setHidden(false);
  }, [active, setHidden]);
}

export function AppShell() {
  const { pathname } = useLocation();
  const smartList = useSmartListEnabled();
  const [navHidden, setNavHidden] = useState(false);
  const nav = useMemo(() => ({ hidden: navHidden, setHidden: setNavHidden }), [navHidden]);
  const items = ITEMS.filter((item) => smartList || !item.requiresSmartList);
  return (
    <div className={`min-h-dvh ${navHidden ? "" : "md:grid md:grid-cols-[5.5rem_1fr]"}`}>
      <a href="#conteudo" className="sr-only print:hidden focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:p-3">
        Saltar para o conteúdo
      </a>
      {!navHidden && (
        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-30 border-t print:hidden border-line bg-paper pb-[calc(8px+env(safe-area-inset-bottom))] md:sticky md:top-0 md:h-dvh md:border-r md:border-t-0 md:pb-0"
        >
          {/* 76 px with the border and the 8 px below (plus the iOS safe area); the items sit centred in the 67 px between. */}
          <ul className="mx-auto flex h-[67px] max-w-xl items-center md:h-full md:flex-col md:items-stretch md:justify-start md:gap-2 md:pt-6">
            {items.map(({ to, also, label, icon, primary }) => {
              const isActive = [to, ...(also ?? [])].some((base) => under(pathname, base));
              return (
                <li key={to} className="flex flex-1 justify-center md:flex-none">
                  <Link
                    to={to}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-[3px] text-xs ${primary ? "" : "w-full"} ${isActive && !primary ? "font-extrabold text-brand" : "font-semibold text-ink-soft"}`}
                  >
                    {primary || !icon ? (
                      <span className="-mt-[22px] grid size-14 place-items-center rounded-full bg-brand text-on-brand shadow-[0_6px_16px_color-mix(in_srgb,var(--color-brand)_35%,transparent)] md:mt-0">
                        <Plus aria-hidden className="size-6" strokeWidth={2.4} />
                      </span>
                    ) : (
                      <span className={`grid h-[30px] w-[52px] place-items-center rounded-[15px] ${isActive ? "bg-brand-pill" : ""}`}>
                        <NavIcon path={icon} active={isActive} />
                      </span>
                    )}
                    <span className={primary ? "sr-only md:not-sr-only" : undefined}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <main id="conteudo" className={`mx-auto w-full max-w-2xl px-5 ${navHidden ? "" : "pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12"}`}>
        <NavContext.Provider value={nav}>
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </NavContext.Provider>
      </main>
    </div>
  );
}
