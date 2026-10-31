import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { PageHeader, Spinner } from "../../components/ui";
import { useAppName } from "../../config/appConfig";
import { useMe } from "../auth/session";

// The tab ids are the paths, like the Talões tabs.
const TABS = [
  { id: "/definicoes/perfil", label: "Perfil" },
  { id: "/definicoes/privacidade", label: "Privacidade" },
  { id: "/definicoes/conta", label: "Conta" },
];

/** Definições: the title, the account header and the Perfil · Privacidade · Conta tabs above the page. */
export function SettingsLayout() {
  const { data: me } = useMe();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const appName = useAppName();
  if (!me) return null;

  return (
    <>
      <PageHeader title="Definições" />
      <div className="flex items-center gap-3 pb-4">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-xl font-bold text-white dark:text-ground">
          {(me.display_name ?? me.email).trim().charAt(0).toLocaleUpperCase("pt-PT")}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-soft">Conta Google</p>
          <p className="truncate font-medium">{me.email}</p>
        </div>
      </div>
      <SegmentedTabs label="Definições" tabs={TABS} value={pathname.replace(/(.)\/$/, "$1")} onChange={navigate} />
      <div className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
        <p className="text-center text-xs text-ink-soft">
          {appName} {__APP_VERSION__}
        </p>
      </div>
    </>
  );
}
