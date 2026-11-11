import { AlertTriangle, Check, CheckCircle2, Info, Loader2, OctagonAlert } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";
import { Link, type LinkProps } from "react-router";
import { ApiError } from "../api/client";
import { STATUS, type ReceiptStatus } from "../lib/status";

type Variant = "primary" | "secondary" | "quiet" | "ghost" | "outline" | "danger" | "dangerQuiet" | "dangerOutline";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-deep",
  secondary: "bg-paper text-brand ring-1 ring-inset ring-line hover:ring-brand",
  quiet: "text-brand hover:bg-brand-soft",
  ghost: "text-ink hover:bg-brand-soft",
  outline: "border-[1.5px] border-ink text-ink hover:bg-brand-soft",
  danger: "bg-alert text-on-brand hover:opacity-90",
  dangerQuiet: "text-alert hover:bg-alert-soft",
  dangerOutline: "border-[1.5px] border-alert text-alert hover:bg-alert-soft",
};

// "lg" is the 56 px call to action the design puts at the foot of a screen.
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "min-h-11 text-[length:calc(13px_*_var(--text-scale))] font-bold",
  md: "min-h-12 text-[length:calc(0.95rem_*_var(--text-scale))] font-semibold",
  lg: "min-h-14 text-base font-bold",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-not-allowed aria-busy:opacity-50";

/** A busy button is not `disabled`: it keeps the focus (A-05), and its click does nothing until the work is done. */
export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  className = "",
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; busy?: boolean }) {
  return (
    <button
      aria-busy={busy}
      aria-disabled={busy || undefined}
      {...props}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      onClick={busy ? (e) => e.preventDefault() : onClick}
    >
      {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = "primary", size = "md", className = "", ...props }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  hideLabel = false,
  error,
  hint,
  note,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; hideLabel?: boolean; error?: string | null; hint?: string; note?: ReactNode }) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const labelEl = (
    <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium text-ink-soft"}>
      {label}
    </label>
  );
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {note ? (
        <div className="flex items-center gap-2">
          {labelEl}
          {note}
        </div>
      ) : (
        labelEl
      )}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="min-h-12 rounded-control border border-line bg-paper px-3 text-base text-ink aria-[invalid=true]:border-alert"
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      <select id={id} className="min-h-12 rounded-control border border-line bg-paper px-3 text-base text-ink" {...props}>
        {children}
      </select>
    </div>
  );
}

const NOTICE = {
  info: { icon: Info, cls: "bg-brand-soft text-ink" },
  success: { icon: CheckCircle2, cls: "bg-ok-soft text-ink" },
  warning: { icon: AlertTriangle, cls: "bg-notice text-ink ring-1 ring-inset ring-warn-line", iconCls: "text-warn-icon", bodyCls: "text-warn-body" },
  error: { icon: OctagonAlert, cls: "bg-alert-soft text-ink" },
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: keyof typeof NOTICE;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const { icon: Icon, cls, iconCls = "", bodyCls = "" } = NOTICE[tone] as { icon: typeof Info; cls: string; iconCls?: string; bodyCls?: string };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-surface p-4 ${cls}`}>
      <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${iconCls}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={`text-sm leading-relaxed ${bodyCls}`}>{children}</div>}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

/** A box to tick before a button that cannot be undone turns on («Compreendo…»): the same on every screen that eliminates something for good. */
export function AcknowledgeBox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 text-sm font-medium">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={`grid size-[26px] shrink-0 place-items-center rounded-lg border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 ${
          checked ? "border-alert bg-alert text-on-brand" : "border-line bg-paper"
        }`}
      >
        {checked && <Check className="size-4" strokeWidth={3} />}
      </span>
      {children}
    </label>
  );
}

const SERVER_MESSAGE = "Algo falhou do nosso lado. Tente de novo daqui a pouco.";

/** The common error frame (T-17, T-18): what failed as the title, the cause below it, «Tentar de novo» when there is a way. A server fault never shows the backend's text. */
export function ErrorNotice({ what, error, onRetry }: { what: string; error: Error; onRetry?: () => void }) {
  const cause = error instanceof ApiError && error.status >= 500 ? SERVER_MESSAGE : error.message;
  return (
    <Notice
      tone="error"
      title={`Não foi possível ${what}.`}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar de novo
          </Button>
        )
      }
    >
      {cause}
    </Notice>
  );
}

export function Spinner({ label = "A carregar…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-ink-soft">
      <Loader2 aria-hidden className="size-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

const TONE_CLASS = {
  progress: "bg-brand-soft text-brand-deep",
  attention: "bg-marker text-marker-ink",
  done: "bg-ok-soft text-ok",
  error: "bg-alert-soft text-alert",
} as const;

export function StatusBadge({ status }: { status: ReceiptStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[s.tone]}`}>
      {s.label}
    </span>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 pb-4 pt-6">
      <h1 className="font-display text-[length:calc(1.75rem_*_var(--text-scale))] font-semibold leading-tight">{title}</h1>
      {children}
    </header>
  );
}

const SURFACE_TONE = { paper: "bg-paper", bordered: "bg-paper ring-1 ring-inset ring-line", alert: "bg-alert-soft" } as const;

export function Surface({
  children,
  className = "",
  tone = "paper",
  dense = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof SURFACE_TONE;
  dense?: boolean;
}) {
  return <section className={`rounded-surface ${dense ? "px-4 py-2" : "p-4"} ${SURFACE_TONE[tone]} ${className}`}>{children}</section>;
}

/** The small label in capitals above a value. */
export const SMALL_CAPS = "text-[length:calc(0.6875rem_*_var(--text-scale))] font-semibold uppercase tracking-widest text-ink-soft";

/** The 44 px round button (back, crop, delete, steppers): the shape, with the colours added by each use. */
export const ROUND_BUTTON =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const ROUND_NEUTRAL = `${ROUND_BUTTON} border-line bg-paper text-ink hover:border-ink`;
export const ROUND_DANGER = `${ROUND_BUTTON} border-line bg-paper text-alert hover:border-alert`;
