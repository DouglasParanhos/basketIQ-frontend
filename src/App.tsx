import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { createBrowserRouter, isRouteErrorResponse, Navigate, Outlet, RouterProvider, useRouteError, type RouteObject } from "react-router";
import { ApiError, setSessionExpiredHandler } from "./api/client";
import { AnnounceProvider } from "./components/Announce";
import { AppShell } from "./components/AppShell";
import { Notice, Spinner } from "./components/ui";
import { DocumentTitle, useAppConfig } from "./config/appConfig";
import { LoginPage } from "./features/auth/LoginPage";
import { RequireSession } from "./features/auth/session";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { HomeRoute } from "./features/home/HomeRoute";
import { ListaPage } from "./features/lista/ListaPage";
import { RequireOnboarding } from "./features/onboarding/RequireOnboarding";
import { PrivacyPage } from "./features/privacy/PrivacyPage";
import { ReceiptPage } from "./features/receipts/ReceiptPage";
import { ReceiptsPage } from "./features/receipts/ReceiptsPage";
import { AccountTab } from "./features/settings/AccountTab";
import { DeleteAccountPage } from "./features/settings/DeleteAccountPage";
import { PrivacyTab } from "./features/settings/PrivacyTab";
import { ProfileTab } from "./features/settings/ProfileTab";
import { SettingsLayout } from "./features/settings/SettingsLayout";
import { TaloesLayout } from "./features/taloes/TaloesLayout";
import { AddPage } from "./features/upload/AddPage";

// Heavier, less used screens are split out of the main bundle.
const ProductsPage = lazy(() => import("./features/products/ProductsPage"));
const ProductPage = lazy(() => import("./features/products/ProductPage"));
const AdminPage = lazy(() => import("./features/admin/AdminPage"));
const OnboardingPage = lazy(() => import("./features/onboarding/OnboardingPage"));
const ToCompletePage = lazy(() => import("./features/groups/ToCompletePage"));

function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? "Esta página não existe."
    : error instanceof Error
      ? error.message
      : "Ocorreu um erro inesperado.";
  return (
    <main className="mx-auto max-w-md p-6">
      <Notice tone="error" title="Não foi possível mostrar esta página" action={<a className="font-semibold text-brand underline" href="/">Voltar ao início</a>}>
        {message}
      </Notice>
    </main>
  );
}

/** The Lista exists only with the smart list on; off (or the config did not arrive) it is the same «page not found» as any unknown route. */
function ListaRoute() {
  const config = useAppConfig();
  if (config.isPending) return <Spinner />;
  return config.data?.smart_list_enabled === true ? <ListaPage /> : <RouteError />;
}

function Protected({ admin = false }: { admin?: boolean }) {
  return (
    <RequireSession admin={admin}>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </RequireSession>
  );
}

/** Above every route, so that each screen has its own title (WCAG 2.4.2). */
function RootLayout() {
  return (
    <AnnounceProvider>
      <DocumentTitle />
      <Outlet />
    </AnnounceProvider>
  );
}

/** Exported so the tests render the real table. */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: "/login", element: <LoginPage />, errorElement: <RouteError /> },
      { path: "/privacidade", element: <PrivacyPage />, errorElement: <RouteError /> },
      // Signed in and consented. The onboarding is a full screen (no navigation bar); every other private page sits behind
      // the onboarding guard, which is above the AppShell so that nothing of the shell shows while it decides.
      {
        element: <Protected />,
        errorElement: <RouteError />,
        children: [
          { path: "/boas-vindas", element: <OnboardingPage /> },
          {
            element: <RequireOnboarding />,
            children: [
              {
                element: <AppShell />,
                errorElement: <RouteError />,
                children: [
                  { path: "/", element: <HomeRoute /> },
                  {
                    element: <TaloesLayout />,
                    children: [
                      { path: "/compras", element: <ReceiptsPage /> },
                      { path: "/compras/resumo", element: <DashboardPage /> },
                      { path: "/produtos", element: <ProductsPage /> },
                    ],
                  },
                  { path: "/compras/:id", element: <ReceiptPage /> },
                  { path: "/adicionar", element: <AddPage /> },
                  { path: "/lista", element: <ListaRoute /> },
                  { path: "/produtos/:id", element: <ProductPage /> },
                  { path: "/por-completar", element: <ToCompletePage /> },
                  {
                    path: "/definicoes",
                    element: <SettingsLayout />,
                    children: [
                      { index: true, element: <Navigate to="/definicoes/perfil" replace /> },
                      { path: "perfil", element: <ProfileTab /> },
                      { path: "privacidade", element: <PrivacyTab /> },
                      { path: "conta", element: <AccountTab /> },
                    ],
                  },
                  { path: "/definicoes/conta/eliminar", element: <DeleteAccountPage /> },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <AppShell />,
        errorElement: <RouteError />,
        children: [
          { element: <Protected admin />, children: [{ path: "/operador", element: <AdminPage /> }] },
          { path: "*", element: <RouteError /> },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routes);

function sessionLost(error: unknown) {
  const publicPage = ["/login", "/privacidade"].includes(window.location.pathname);
  if (error instanceof ApiError && error.status === 401 && !publicPage) {
    window.location.assign("/login?error=session_expired");
  }
}

export function App() {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: sessionLost }),
        mutationCache: new MutationCache({ onError: sessionLost }),
        defaultOptions: {
          queries: { retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2 },
        },
      }),
  );
  setSessionExpiredHandler(() => sessionLost(new ApiError(401, undefined)));
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
