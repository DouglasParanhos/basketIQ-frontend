import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { SMALL_CAPS } from "../../components/ui";
import { useMerchants, useProfile } from "../profile/useProfile";

const AUTO = "Detetar sozinho";
const MISSING = "Não foi possível carregar os supermercados. Pode enviar na mesma.";

/**
 * The optional supermarket (second screen, with the parts). `""` means «Detetar sozinho». The names come from the API; the
 * person's usual supermarkets (their profile) come first, in a group of their own when there are others to tell them from.
 */
export function MerchantField({ value, onChange, disabled }: { value: string; onChange: (merchant: string) => void; disabled?: boolean }) {
  const merchants = useMerchants();
  const profile = useProfile();
  const selectId = useId();
  const usual = new Set(profile.data?.merchants);
  const mine = merchants.data?.filter(({ id }) => usual.has(id)) ?? [];
  const others = merchants.data?.filter(({ id }) => !usual.has(id)) ?? [];
  const option = ({ id, name }: { id: string; name: string }) => (
    <option key={id} value={id}>
      {name}
    </option>
  );
  return (
    <div>
      <div className="relative rounded-surface bg-paper px-4 py-3 ring-1 ring-inset ring-line">
        <label htmlFor={selectId} className={`block ${SMALL_CAPS}`}>
          Supermercado (opcional)
        </label>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="min-h-11 w-full appearance-none bg-transparent pr-8 text-[length:calc(15px_*_var(--text-scale))] font-bold text-ink disabled:opacity-50"
        >
          <option value="">{AUTO}</option>
          {mine.length > 0 && others.length > 0 ? (
            <>
              <optgroup label="Os seus supermercados">{mine.map(option)}</optgroup>
              <optgroup label="Outros supermercados">{others.map(option)}</optgroup>
            </>
          ) : (
            merchants.data?.map(option)
          )}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute bottom-6 right-4 size-5 text-ink-soft" />
      </div>
      {merchants.isError && <p className="mt-1 text-sm text-ink-soft">{MISSING}</p>}
    </div>
  );
}
