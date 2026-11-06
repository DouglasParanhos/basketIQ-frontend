import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { BrandMark } from "../../components/BrandMark";
import { Button, Spinner } from "../../components/ui";
import { useAppName } from "../../config/appConfig";
import { signInError, usePasskeySignIn, usePasskeySupport } from "./passkeys";
import { useMe } from "./session";

const ERRORS: Record<string, string> = {
  cancelled: "O início de sessão foi cancelado. Pode tentar novamente quando quiser.",
  login_failed: "Não foi possível confirmar a sua conta Google. Tente novamente.",
  provider_unavailable: "O serviço da Google não respondeu. Tente novamente dentro de momentos.",
  provider_error: "A Google devolveu um erro. Tente novamente.",
  invalid_request: "O pedido de início de sessão expirou. Tente novamente.",
  session_expired: "A sua sessão terminou. Entre novamente para continuar.",
};

// Receipts that scroll behind the ticket (decoration only).
const LEFT_LINES = [
  "LEITE MEIO GORDO 0,79",
  "BANANA 0,856 KG 1,23",
  "PAO DE FORMA 1,29",
  "ARROZ AGULHA 1KG 1,19",
  "ATUM EM AZEITE 1,79",
  "QUEIJO FLAMENGO 3,49",
  "IOGURTE NATURAL X4 1,35",
  "FRANGO PEITO KG 5,49",
  "CAFE MOIDO 250G 2,49",
  "MACA GALA KG 2,19",
  "AZEITE VIRGEM 0,75L 6,99",
  "OVOS M X12 2,89",
  "BATATA KG 1,19",
  "CEBOLA KG 0,99",
  "MASSA ESPARGUETE 1,09",
  "--------------------",
];
const RIGHT_LINES = [
  "SUMO LARANJA 1L 1,69",
  "TOMATE KG 2,19",
  "CENOURA KG 0,89",
  "FIAMBRE PERU 1,59",
  "MANTEIGA 250G 2,39",
  "CEREAIS 500G 2,79",
  "ALFACE UN 0,79",
  "PEIXE ESPADA KG 7,99",
  "AGUA 6X1,5L 2,10",
  "DETERGENTE 2L 4,49",
  "PAPEL COZINHA X2 1,89",
  "BOLACHA MARIA 0,89",
  "PESSEGO KG 2,49",
  "FEIJAO 500G 1,19",
  "FARINHA 1KG 0,99",
  "--------------------",
];
const STEPS = ["1x FAÇA COMPRAS", "2x FOTOGRAFE OU PARTILHE", "3x PERCEBA OS GASTOS", "4x ACOMPANHE"];

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

/**
 * One column of receipts at the edge of the screen, cut by it, at a tenth of the opacity. The lines are generated
 * content (.receipt-column::before, from data-lines), not text of the page: they are decoration, and at that
 * opacity no colour could pass the 4.5:1 the checker asks of text.
 */
function ReceiptColumn({ lines, side }: { lines: string[]; side: "left" | "right" }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-y-0 w-[110px] overflow-hidden opacity-10 ${side === "left" ? "-left-[46px]" : "-right-[46px] text-right"}`}>
      <div data-lines={lines.join("\n")} className={`receipt-column font-receipt text-[11px] leading-[1.7] ${side === "left" ? "ticket-up" : "ticket-down"}`} />
    </div>
  );
}

/** «Entrar com passkey»: only on a phone that holds one. The tap opens the phone's lock at once (see passkeys.ts). */
function PasskeyButton({ onError }: { onError: (message: string) => void }) {
  const { options, mutation: signIn } = usePasskeySignIn();
  if (!options?.allowCredentials?.length) return null;
  return (
    <Button
      variant="outline"
      size="lg"
      className="gap-3 py-2"
      busy={signIn.isPending}
      onClick={() => signIn.mutate(undefined, { onError: (e) => onError(signInError(e) ?? ERRORS.cancelled!) })}
    >
      <Fingerprint aria-hidden className="size-6 shrink-0" />
      <span className="flex flex-col text-left">
        <span className="font-extrabold">Entrar com passkey</span>
        <span className="text-[12px] font-normal text-ink-soft">Digital, rosto ou PIN do telemóvel</span>
      </span>
    </Button>
  );
}

export function LoginPage() {
  const { data: me, isLoading } = useMe();
  const appName = useAppName();
  const passkeys = usePasskeySupport();
  const [params] = useSearchParams();
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);
  const error = params.get("error");

  if (isLoading) return <Spinner />;
  if (me) return <Navigate to="/" replace />;

  const message = passkeyMessage ?? (error && (ERRORS[error] ?? ERRORS.login_failed));
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-between gap-8 overflow-hidden px-6 pb-7 pt-8">
      {message && (
        <p role="status" className="absolute inset-x-4 top-3.5 z-10 rounded-2xl bg-warn-soft px-3.5 py-3 text-[13px] leading-[1.45] text-warn-ink shadow-[0_6px_16px_rgb(20_20_19/0.18)]">
          {message}
        </p>
      )}
      <ReceiptColumn lines={LEFT_LINES} side="left" />
      <ReceiptColumn lines={RIGHT_LINES} side="right" />

      {/* Only the name and the slogan are read; the slot, the logo, the lines and the total are decoration. */}
      <div className="ticket-paper relative">
        {/* In the dark scheme the black slot would vanish on the dark ground: a light outline brings it back. */}
        <div aria-hidden className="relative z-[2] h-4 rounded-lg bg-ink shadow-[0_3px_0_rgb(27_27_26/0.15)] dark:ring-1 dark:ring-ink-soft" />
        <div className="ticket-shake relative z-[1] mx-5 -mt-1">
          <div className="ticket-reveal torn bg-paper px-[18px] pb-[30px] pt-6 text-ink shadow-[0_1px_0_#e4ded3] [--tear:8px]">
            <div className="flex flex-col items-center gap-1.5">
              <BrandMark className="h-[30px] w-auto" />
              <h1 className="font-display text-[21px] font-semibold uppercase tracking-[0.04em]">{appName}</h1>
              <p className="font-display text-[15px] font-semibold tracking-[0.06em]">
                <span className="ticket-marker px-1.5">CADA TALÃO CONTA</span>
              </p>
            </div>
            <div aria-hidden>
              <div className="mb-2.5 mt-3.5 border-t border-dashed border-[#8a857b]" />
              <div className="font-receipt text-[12.5px] leading-[1.7]">
                {STEPS.map((step) => (
                  <div key={step}>{step}</div>
                ))}
              </div>
              <div className="my-2.5 border-t border-dashed border-[#8a857b]" />
              <div className="flex items-baseline justify-between">
                <span className="font-receipt text-sm font-semibold">TOTAL</span>
                <span className="font-display text-lg font-semibold text-brand">CONTROLO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-3">
        {/* Full-page navigation: the OAuth flow is handled by the API (BFF). */}
        <a
          href="/v1/auth/login"
          className="flex h-14 items-center justify-center gap-3 rounded-[28px] bg-brand text-base font-extrabold text-white hover:bg-brand-deep dark:text-ground"
        >
          <span className="grid size-8 place-items-center rounded-full bg-white">
            <GoogleMark />
          </span>
          Entrar com Google
        </a>
        {passkeys && <PasskeyButton onError={setPasskeyMessage} />}
        <p className="mt-0.5 text-center text-[13px] leading-[1.4] text-ink-soft">
          Usamos apenas o seu nome e e-mail.{" "}
          {/* The padding makes the hit area 44 px high without changing the line. */}
          <a className="py-[13px] font-bold text-brand underline" href="/privacidade">
            Política de privacidade
          </a>
        </p>
      </div>
    </main>
  );
}
