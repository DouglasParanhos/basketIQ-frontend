import { Check } from "lucide-react";
import { useId } from "react";
import { Select } from "../../components/ui";
import { initialsOf } from "../onboarding/state";
import { useMerchants } from "../profile/useProfile";

const AUTO = "Detetar sozinho";
const MISSING = "Não foi possível carregar os supermercados. Pode enviar na mesma.";

/** The optional store, as chips (first screen). `""` means «Detetar sozinho». The names come from the API. */
export function MerchantChips({ value, onChange }: { value: string; onChange: (merchant: string) => void }) {
  const merchants = useMerchants();
  const labelId = useId();
  const options = [{ id: "", name: AUTO }, ...(merchants.data ?? [])];
  return (
    <div>
      <p id={labelId} className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Supermercado (opcional)
      </p>
      {/* Native radios, hidden: the arrow keys move between the chips. */}
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map(({ id, name }) => (
          <label
            key={id || "auto"}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-inset ring-line has-checked:bg-brand has-checked:text-white has-checked:ring-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand dark:has-checked:text-ground"
          >
            <input type="radio" name="merchant" value={id} checked={value === id} onChange={() => onChange(id)} className="sr-only" />
            {id && (
              <span aria-hidden className="grid size-6 place-items-center rounded-full bg-brand-soft text-xs font-extrabold text-brand-deep">
                {initialsOf(name)}
              </span>
            )}
            {name}
            {value === id && <Check aria-hidden className="size-4" strokeWidth={3} />}
          </label>
        ))}
      </div>
      {merchants.isError && <p className="mt-2 text-sm text-ink-soft">{MISSING}</p>}
    </div>
  );
}

/** The same choice as a field (second screen), bound to the same state. */
export function MerchantField({ value, onChange, disabled }: { value: string; onChange: (merchant: string) => void; disabled?: boolean }) {
  const merchants = useMerchants();
  return (
    <div>
      <Select label="Supermercado (opcional)" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{AUTO}</option>
        {merchants.data?.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </Select>
      {merchants.isError && <p className="mt-1 text-sm text-ink-soft">{MISSING}</p>}
    </div>
  );
}
