import type { Merchant } from "../api/client";

/**
 * The one table of the stores: name, initials and colours, by the code the API returns (Merchant of the schema).
 * The colours are the ones of the approved design (canvas «Mercados»); they are fixed in both schemes, as a logo is,
 * so a light tile (Mercadona, Auchan) stays light in the dark scheme. The tile, the pill and the segments of the
 * stacked bar all read this table. The list of stores a person can choose comes from the API (GET /v1/merchants).
 */
export interface MerchantStyle {
  name: string;
  /** One letter, two where one would collide («EC» with Continente's «C», «AU» with Aldi's «A»). */
  initials: string;
  background: string;
  /** The letters over the background. */
  letter: string;
  border: string;
  /** The solid colour of a bar that is not stacked (Resumo): the border where the tile has one, else the letter. */
  bar: string;
}

const tile = (name: string, initials: string, background: string, letter: string, border = background, bar = border): MerchantStyle => ({
  name,
  initials,
  background,
  letter,
  border,
  bar,
});

/**
 * Auchan's red (#DF0613) is 4 units darker in the red channel than Continente's (#E30613), for contrast only: the canvas red gives
 * 4.40:1 on the light tile and the axe asks for 4.5:1, this one gives 4.53:1. The real distinction is the shape (Continente solid
 * with a white «C», Auchan light with a red border and «AU»), never the colour. The colour is provisional in the design («cor por confirmar»).
 * Typed by the API's codes: a new store in the schema is a compile error here until it has its colours.
 */
const MERCHANTS: Record<Exclude<Merchant, "UNKNOWN">, MerchantStyle> = {
  CONTINENTE: tile("Continente", "C", "#E30613", "#FFFFFF"),
  PINGO_DOCE: tile("Pingo Doce", "P", "#6BB743", "#14290A"),
  LIDL: tile("Lidl", "L", "#0050AA", "#FFCC00"),
  AUCHAN: tile("Auchan", "AU", "#F4F3EF", "#DF0613", "#DF0613"),
  ALDI: tile("Aldi", "A", "#002D72", "#FFFFFF"),
  MERCADONA: tile("Mercadona", "M", "#F4F3EF", "#006F42", "#006F42"),
  EL_CORTE_INGLES: tile("El Corte Inglés", "EC", "#004731", "#FFFFFF"),
};

/** A store the table does not know (a new code from the API, «UNKNOWN», or none): a neutral «?», never an initial that could pass for another store's. */
const OTHER = tile("Outra loja", "?", "#E6E2D9", "#5A564F", "#E6E2D9", "#5A564F");

export const KNOWN_MERCHANTS: readonly string[] = Object.keys(MERCHANTS);

/** The style of a store; unknown, empty or inherited keys (`toString`) give the neutral one. Never throws. */
export function merchantStyle(code: string | null | undefined): MerchantStyle {
  return code && Object.hasOwn(MERCHANTS, code) ? MERCHANTS[code as keyof typeof MERCHANTS] : OTHER;
}

/** The stores a person can pick: every known chain, not «Outra loja». */
export const MERCHANT_OPTIONS: [code: string, name: string][] = Object.entries(MERCHANTS).map(([code, m]) => [code, m.name]);

/** The same plus «Outra loja»: the Loja field of a receipt under review. */
export const MERCHANT_CHOICES: [code: string, name: string][] = [...MERCHANT_OPTIONS, ["UNKNOWN", OTHER.name]];

/** Name shown for a purchase: a store without a parser shows the name read from the receipt or typed. */
export function merchantName(code: string | null | undefined, name?: string | null): string {
  if (!code || code === "UNKNOWN") return name || (code ? OTHER.name : "Loja por identificar");
  return Object.hasOwn(MERCHANTS, code) ? merchantStyle(code).name : code;
}
