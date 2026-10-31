import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useNavHidden } from "../../components/AppShell";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { PageHeader, Spinner, Surface } from "../../components/ui";
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
  // A page of Definições that is a full screen (editing the profile) takes the title, the account and the tabs away.
  const full = useNavHidden();
  if (!me) return null;

  // The Outlet keeps its place in the tree, so the page keeps its state when the rest comes and goes.
  return (
    <>
      {!full && <PageHeader title="Definições" />}
      {!full && (
        <Surface tone="bordered" className="mb-4 flex items-center gap-3">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-xl font-bold text-white dark:text-ground">
            {(me.display_name ?? me.email).trim().charAt(0).toLocaleUpperCase("pt-PT")}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold">Conta Google</p>
            <p className="truncate text-[13px] text-ink-soft">{me.email}</p>
          </div>
        </Surface>
      )}
      {!full && <SegmentedTabs label="Definições" tabs={TABS} value={pathname.replace(/(.)\/$/, "$1")} onChange={navigate} />}
      <div className={`flex flex-col gap-4 ${full ? "" : "pt-4"}`}>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
        {!full && (
          <p className="text-center text-xs text-ink-soft">
            {appName} {__APP_VERSION__}
          </p>
        )}
      </div>
    </>
  );
}
