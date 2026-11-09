import { FileQuestion } from "lucide-react";

/** «Sem informação»: where there is nothing to show, a receipt-style stamp says so (text and icon, never colour alone); no number is invented. */
export function NoInfoStamp({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex -rotate-2 items-center gap-1 rounded-md border-2 border-dashed border-ink-soft px-1.5 py-0.5 text-[length:calc(11px_*_var(--text-scale))] font-extrabold uppercase tracking-wide text-ink-soft ${className}`}
    >
      <FileQuestion aria-hidden className="size-3.5" />
      Sem informação
    </span>
  );
}
