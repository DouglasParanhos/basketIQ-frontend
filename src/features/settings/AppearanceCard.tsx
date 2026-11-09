import { useId } from "react";
import { RadioPills } from "../../components/RadioPills";
import { SMALL_CAPS, Surface } from "../../components/ui";
import { TEXT_SIZES, useTextSize } from "../../lib/textSize";
import { useThemePreference, type ThemePreference } from "../../lib/theme";

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "auto", label: "Automático" },
  { id: "light", label: "Claro" },
  { id: "dark", label: "Escuro" },
];

/** Aparência: follow the system or pick the light or the dark scheme, and the size of the text. Both apply at once and stay on this device. */
export function AppearanceCard() {
  const titleId = useId();
  const sizeId = useId();
  const [preference, setPreference] = useThemePreference();
  const [size, setSize] = useTextSize();

  return (
    <Surface tone="bordered">
      <h3 id={titleId} className={SMALL_CAPS}>
        Aparência
      </h3>
      <RadioPills labelledBy={titleId} options={OPTIONS} value={preference} onChange={setPreference} className="mt-3 grid grid-cols-3 gap-1.5" dense />
      <h4 id={sizeId} className="mt-5 text-sm font-semibold">
        Tamanho do texto
      </h4>
      <RadioPills labelledBy={sizeId} options={TEXT_SIZES.map(({ id, label }) => ({ id, label }))} value={size} onChange={setSize} className="mt-2 flex-wrap" />
      <p className="mt-3 rounded-control bg-brand-soft px-3 py-2">
        Exemplo: Leite meio-gordo, 6 un.
        <span className="block text-xs text-ink-soft">Assim se lê o texto pequeno, como as quantidades e as notas.</span>
      </p>
    </Surface>
  );
}
