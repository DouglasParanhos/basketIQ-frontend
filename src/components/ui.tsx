import { AlertTriangle, CheckCircle2, Info, Loader2, OctagonAlert } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";
import { Link, type LinkProps } from "react-router";
import { STATUS, type ReceiptStatus } from "../lib/status";

type Variant = "primary" | "secondary" | "quiet" | "danger" | "dangerQuiet";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-deep dark:text-ground",
  secondary: "bg-paper text-brand ring-1 ring-inset ring-line hover:ring-brand",
  quiet: "text-brand hover:bg-brand-soft",
  danger: "bg-alert text-white hover:opacity-90 dark:text-ground",
  dangerQuiet: "text-alert hover:bg-alert-soft",
};

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-4 text-[0.95rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  busy = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} disabled={busy || props.disabled} aria-busy={busy} {...props}>
      {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = "primary", className = "", ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  error,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: string }) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
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
  warning: { icon: AlertTriangle, cls: "bg-marker/40 text-ink" },
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
  const { icon: Icon, cls } = NOTICE[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-surface p-4 ${cls}`}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-sm leading-relaxed">{children}</div>}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
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
      <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight">{title}</h1>
      {children}
    </header>
  );
}

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-surface bg-paper p-4 ${className}`}>{children}</section>;
}
