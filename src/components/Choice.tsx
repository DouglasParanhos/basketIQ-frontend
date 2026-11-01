import { Check } from "lucide-react";
import type { ChangeEventHandler, ReactNode } from "react";

/** The state of a choice is shown by a tick as well as by the frame: colour is never the only sign. */
export function Tick({ checked, small = false, className = "" }: { checked: boolean; small?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid ${small ? "size-5" : "size-7"} shrink-0 place-items-center rounded-full ${checked ? "bg-brand text-white dark:text-ground" : "border-2 border-line"} ${className}`}
    >
      {checked && <Check className="size-4" strokeWidth={3} />}
    </span>
  );
}

/** A choice as a pill (44 px): the tick sits before the name when it is chosen, so the state is not colour alone. */
export function ChoicePill({ checked, onChange, children }: { checked: boolean; onChange: ChangeEventHandler<HTMLInputElement>; children: ReactNode }) {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-bold ring-1 ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
        checked ? "bg-brand text-white ring-brand dark:text-ground" : "text-ink ring-line"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {checked && <Check aria-hidden className="size-4" strokeWidth={3} />}
      {children}
    </label>
  );
}

export function ChoiceCard({
  checked,
  onChange,
  className = "",
  children,
}: {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`relative flex cursor-pointer rounded-surface border-2 bg-paper has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${checked ? "border-brand" : "border-line"} ${className}`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}
