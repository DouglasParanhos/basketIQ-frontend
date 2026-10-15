import { Navigate, useSearchParams } from "react-router";
import { Notice, Spinner } from "../../components/ui";
import { useMe } from "./session";

const ERRORS: Record<string, string> = {
  cancelled: "O início de sessão foi cancelado. Pode tentar novamente quando quiser.",
  login_failed: "Não foi possível confirmar a sua conta Google. Tente novamente.",
  provider_unavailable: "O serviço da Google não respondeu. Tente novamente dentro de momentos.",
  provider_error: "A Google devolveu um erro. Tente novamente.",
  invalid_request: "O pedido de início de sessão expirou. Tente novamente.",
  session_expired: "A sua sessão terminou. Entre novamente para continuar.",
};

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginPage() {
  const { data: me, isLoading } = useMe();
  const [params] = useSearchParams();
  const error = params.get("error");

  if (isLoading) return <Spinner />;
  if (me) return <Navigate to="/" replace />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 pb-10 pt-16">
      <div>
        <div aria-hidden className="receipt-paper mb-10 max-w-64 -rotate-2">
          <p className="text-center font-semibold">BASKETIQ</p>
          <hr />
          <p className="flex justify-between">
            <span>LEITE MEIO GORDO</span>
            <span>0,79</span>
          </p>
          <p className="flex justify-between">
            <span>BANANA 0,856 X 1,44</span>
            <span>1,23</span>
          </p>
          <p className="flex justify-between">
            <span>PAO DE FORMA</span>
            <span>1,29</span>
          </p>
          <hr />
          <p className="flex justify-between font-semibold">
            <span>TOTAL</span>
            <span>3,31</span>
          </p>
        </div>
        <h1 className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight">
          As suas notas de supermercado, organizadas.
        </h1>
        <p className="mt-4 max-w-sm text-lg leading-relaxed text-ink-soft">
          Fotografe ou envie a nota do Continente, Pingo Doce, Lidl ou Auchan. O BasketIQ lê os produtos e mostra quanto gasta, onde e
          como mudam os preços.
        </p>
      </div>
      <div className="mt-10 flex flex-col gap-4">
        {error && <Notice tone={error === "cancelled" ? "info" : "error"}>{ERRORS[error] ?? ERRORS.login_failed}</Notice>}
        {/* Full-page navigation: the OAuth flow is handled by the API (BFF). */}
        <a
          href="/v1/auth/login"
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-control bg-cobalt px-5 text-lg font-semibold text-white hover:bg-cobalt-deep dark:text-ground"
        >
          <span className="grid size-8 place-items-center rounded-full bg-white">
            <GoogleMark />
          </span>
          Entrar com Google
        </a>
        <p className="text-center text-sm text-ink-soft">
          Usamos apenas o seu nome e e-mail.{" "}
          <a className="font-medium text-cobalt underline" href="/privacidade">
            Política de privacidade
          </a>
        </p>
      </div>
    </main>
  );
}
