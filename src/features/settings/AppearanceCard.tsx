import { Check } from "lucide-react";
import { useId, type KeyboardEvent } from "react";
import { STEP } from "../../components/SegmentedTabs";
import { SMALL_CAPS, Surface } from "../../components/ui";
import { useThemePreference, type ThemePreference } from "../../lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

/** Aparência: follow the system or pick the light or the dark scheme. It applies at once and stays on this device. */
export function AppearanceCard() {
  const titleId = useId();
  const [preference, setPreference] = useThemePreference();

  // A group of radios is one stop of the Tab key; the arrows move the choice (and the focus) inside it.
  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + OPTIONS.length) % OPTIONS.length;
    setPreference(OPTIONS[next]!.value);
    (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  }

  return (
    <Surface tone="bordered">
      <h3 id={titleId} className={SMALL_CAPS}>
        Aparência
      </h3>
      <div role="radiogroup" aria-labelledby={titleId} className="mt-3 grid grid-cols-3 gap-1.5">
        {OPTIONS.map(({ value, label }, index) => {
          const checked = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => setPreference(value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-bold text-ink ring-1 ring-inset ring-line aria-checked:bg-brand aria-checked:text-on-brand aria-checked:ring-brand"
            >
              {checked && <Check aria-hidden className="size-4" strokeWidth={3} />}
              {label}
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
