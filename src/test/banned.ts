/** The words the product never uses on any screen (decided 08/11/2026, RF-13). A screen's own test adds the words that only it avoids, with `banned("...")`. */
const EVERYWHERE = String.raw`poupar|poupa\b|poupou|economizar|orçamento|você|mais barato|\bcaro\b`;

export const BANNED = new RegExp(EVERYWHERE, "i");

export const banned = (extra: string) => new RegExp(`${EVERYWHERE}|${extra}`, "i");
