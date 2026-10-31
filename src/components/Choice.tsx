import { Check } from "lucide-react";
import type { ChangeEventHandler, ReactNode } from "react";

/** The state of a choice is shown by a tick as well as by the frame: colour is never the only sign. */
export function Tick({ checked, className = "" }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-7 shrink-0 place-items-center rounded-full ${checked ? "bg-brand text-white dark:text-ground" : "border-2 border-line"} ${className}`}
    >
      {checked && <Check className="size-4" strokeWidth={3} />}
    </span>
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
      className={`relative flex min-h-16 cursor-pointer rounded-surface border-2 bg-paper p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${checked ? "border-brand" : "border-line"} ${className}`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}
