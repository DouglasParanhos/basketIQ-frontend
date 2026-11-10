import { Check } from "lucide-react";
import { merchantStyle, type MerchantStyle } from "../lib/merchants";

interface TileProps {
  code: string | null | undefined;
  /** Side in px (20 legend, 24 chip, 40 row, 44 onboarding in the design). */
  size: number;
  /** Font size in px; the design sets it by size (11 at 20 and 24, 18 at 40, 22 at 44). */
  fontSize: number;
  /** The full name, when no text next to the tile already says it; without it the tile is hidden from the screen reader. */
  label?: string;
}

const colours = ({ background, letter, border }: MerchantStyle) => ({ background, color: letter, borderColor: border });

/** The initials of a store on its colour. The shape and letters tell the stores apart, never the colour alone. */
export function MarketTile({ code, size, fontSize, label }: TileProps) {
  const style = merchantStyle(code);
  const { initials } = style;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="font-display inline-flex shrink-0 items-center justify-center border-[1.5px] font-semibold"
      style={{
        ...colours(style),
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        // Two letters («EC», «AU») at 78 % of the size, as in the design.
        fontSize: initials.length > 1 ? Math.round(fontSize * 0.78) : fontSize,
      }}
    >
      {initials}
    </span>
  );
}

/**
 * The full name of a store as a pill (Definições and text contexts): chosen = the store's colour with its letters,
 * not chosen = paper with the store's border and its tile. `checkmark` adds the «✓» before the name when chosen.
 */
export function MarketPill({ code, name, selected = true, checkmark = false }: { code: string | null | undefined; name: string; selected?: boolean; checkmark?: boolean }) {
  const style = merchantStyle(code);
  return (
    <span
      className={`inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] px-3.5 text-[length:calc(13px_*_var(--text-scale))] font-bold ${selected ? "" : "bg-paper text-ink"}`}
      style={selected ? colours(style) : { borderColor: style.border }}
    >
      {selected && checkmark && <Check aria-hidden className="size-4" strokeWidth={3} />}
      {!selected && <MarketTile code={code} size={24} fontSize={11} />}
      {name}
    </span>
  );
}

/** One segment of the stacked bar of the spending by store: the tile's colours, so a light store (Mercadona, Auchan) keeps its border and Continente's red next to it stays apart. */
export function MarketSegment({ code, share }: { code: string | null | undefined; share: number }) {
  const style = merchantStyle(code);
  return (
    <span
      className="flex h-full min-w-0 items-center justify-center overflow-hidden border-[1.5px] text-xs font-extrabold"
      style={{ ...colours(style), flex: `${Math.max(share, 1)} 1 0` }}
    >
      {style.initials}
    </span>
  );
}
