import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { createBrowserRouter, isRouteErrorResponse, Outlet, RouterProvider, useRouteError } from "react-router";
import { ApiError, setSessionExpiredHandler } from "./api/client";
import { AppShell } from "./components/AppShell";
import { Notice, Spinner } from "./components/ui";
import { DocumentTitle } from "./config/appConfig";
import { LoginPage } from "./features/auth/LoginPage";
import { RequireSession } from "./features/auth/session";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { PrivacyPage } from "./features/privacy/PrivacyPage";
import { ReceiptPage } from "./features/receipts/ReceiptPage";
import { ReceiptsPage } from "./features/receipts/ReceiptsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { AddPage } from "./features/upload/AddPage";

// Heavier, less used screens are split out of the main bundle.
const ProductsPage = lazy(() => import("./features/products/ProductsPage"));
const ProductPage = lazy(() => import("./features/products/ProductPage"));
const AdminPage = lazy(() => import("./features/admin/AdminPage"));

function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? "Esta página não existe."
    : error instanceof Error
      ? error.message
      : "Ocorreu um erro inesperado.";
  return (
    <main className="mx-auto max-w-md p-6">
      <Notice tone="error" title="Não foi possível mostrar esta página" action={<a className="font-semibold text-cobalt underline" href="/">Voltar ao resumo</a>}>
        {message}
      </Notice>
    </main>
  );
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

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage />, errorElement: <RouteError /> },
  { path: "/privacidade", element: <PrivacyPage />, errorElement: <RouteError /> },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        element: <Protected />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/compras", element: <ReceiptsPage /> },
          { path: "/compras/:id", element: <ReceiptPage /> },
          { path: "/adicionar", element: <AddPage /> },
          { path: "/produtos", element: <ProductsPage /> },
          { path: "/produtos/:id", element: <ProductPage /> },
          { path: "/definicoes", element: <SettingsPage /> },
        ],
      },
      { element: <Protected admin />, children: [{ path: "/operador", element: <AdminPage /> }] },
      { path: "*", element: <RouteError /> },
    ],
  },
]);

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
      <DocumentTitle />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
