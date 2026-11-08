import { useId } from "react";
import { RadioPills } from "../../components/RadioPills";
import { SMALL_CAPS, Surface } from "../../components/ui";
import { useThemePreference, type ThemePreference } from "../../lib/theme";

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "auto", label: "Automático" },
  { id: "light", label: "Claro" },
  { id: "dark", label: "Escuro" },
];

/** Aparência: follow the system or pick the light or the dark scheme. It applies at once and stays on this device. */
export function AppearanceCard() {
  const titleId = useId();
  const [preference, setPreference] = useThemePreference();

  return (
    <Surface tone="bordered">
      <h3 id={titleId} className={SMALL_CAPS}>
        Aparência
      </h3>
      <RadioPills labelledBy={titleId} options={OPTIONS} value={preference} onChange={setPreference} className="mt-3 grid grid-cols-3 gap-1.5" dense />
    </Surface>
  );
}
