import { Check } from "lucide-react";
import { useId, type ReactNode } from "react";

/**
 * One choice among a few, as pills. They are native radios, so the browser gives the arrow keys, a single Tab stop and
 * the checked state; the tick keeps colour from being the only sign of the choice.
 */
export function RadioPills<T extends string>({
  label,
  labelledBy,
  options,
  value,
  onChange,
  className = "",
  dense = false,
}: {
  label?: string;
  labelledBy?: string;
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  /** For a grid of equal cells: no side padding, so the text fits the cell. */
  dense?: boolean;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} aria-labelledby={labelledBy} className={`-m-1 flex gap-2 overflow-x-auto p-1 ${className}`}>
      {options.map((o) => {
        const checked = o.id === value;
        return (
          <label
            key={o.id}
            className={`relative inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full ${dense ? "" : "px-3.5"} text-sm font-semibold text-ink ring-1 ring-inset ring-line has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${checked ? "bg-brand text-on-brand ring-brand" : ""}`}
          >
            <input type="radio" name={name} checked={checked} onChange={() => onChange(o.id)} className="sr-only" />
            {checked && <Check aria-hidden className="size-4" strokeWidth={3} />}
            {o.label}
          </label>
        );
      })}
    </div>
  );
}
