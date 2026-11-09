import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useNavHidden } from "../../components/AppShell";
import { BrandMark } from "../../components/BrandMark";
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

/** The end of Definições: the brand, not a link, and the notice about the names of the stores. */
function BrandFooter({ appName }: { appName: string }) {
  return (
    <footer className="flex flex-col items-center gap-1 pb-8 pt-8 text-center">
      <BrandMark className="mb-1 h-7 w-auto" />
      <p className="font-display text-base font-semibold">{appName}</p>
      <p className="text-[length:calc(13px_*_var(--text-scale))] text-ink-soft">os seus talões</p>
      <p className="text-xs text-ink-soft">v{__APP_VERSION__}</p>
      <p className="mt-2 max-w-xs text-xs text-ink-soft">Marcas e nomes pertencem aos respetivos titulares. Sem afiliação.</p>
    </footer>
  );
}

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
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-brand font-display text-xl font-semibold text-on-brand">
            {(me.display_name ?? me.email).trim().charAt(0).toLocaleUpperCase("pt-PT")}
          </span>
          <div className="min-w-0">
            <p className="text-[length:calc(15px_*_var(--text-scale))] font-bold">Conta Google</p>
            <p className="truncate text-[length:calc(13px_*_var(--text-scale))] text-ink-soft">{me.email}</p>
          </div>
        </Surface>
      )}
      {!full && <SegmentedTabs label="Definições" tabs={TABS} value={pathname.replace(/(.)\/$/, "$1")} onChange={navigate} />}
      <div className={`flex flex-col gap-4 ${full ? "" : "pt-4"}`}>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
        {!full && <BrandFooter appName={appName} />}
      </div>
    </>
  );
}
