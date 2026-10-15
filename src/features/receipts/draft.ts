import type { Schemas } from "../../api/client";
import { centsToInput, parseEurToCents, parseQuantity, quantityToInput } from "../../lib/format";

type Line = Schemas["LineOut"];
type LinePatch = Schemas["LinePatchIn"];

export type LineField = "product" | "raw_description" | "quantity" | "unit" | "unit_price" | "line_total" | "discount";

export interface DraftLine {
  key: string;
  id?: string;
  raw_description: string;
  product_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
  line_total: string;
  discount: string;
  touched: LineField[];
  source?: Line;
}

let seq = 0;
const newKey = () => `new-${++seq}`;

export function toDraft(line: Line): DraftLine {
  return {
    key: line.id,
    id: line.id,
    raw_description: line.raw_description,
    product_name: line.product?.name ?? "",
    quantity: quantityToInput(line.quantity),
    unit: line.unit ?? "un",
    unit_price: centsToInput(line.unit_price_cents),
    line_total: centsToInput(line.line_total_cents),
    discount: line.discount_cents ? centsToInput(line.discount_cents) : "",
    touched: [],
    source: line,
  };
}

export function emptyLine(): DraftLine {
  return {
    key: newKey(),
    raw_description: "",
    product_name: "",
    quantity: "1",
    unit: "un",
    unit_price: "",
    line_total: "",
    discount: "",
    touched: ["raw_description", "quantity", "unit", "unit_price", "line_total"],
  };
}

export function setField(line: DraftLine, field: LineField, value: string): DraftLine {
  const key = field === "product" ? "product_name" : field;
  const touched = line.touched.includes(field) ? line.touched : [...line.touched, field];
  return { ...line, [key]: value, touched };
}

/** Split one line into two (RF-07): integer quantities are divided, otherwise the total is halved. */
export function splitLine(line: DraftLine): [DraftLine, DraftLine] {
  const qty = Number((parseQuantity(line.quantity) ?? "1").split(".")[0]);
  const total = parseEurToCents(line.line_total) ?? 0;
  const unit = parseEurToCents(line.unit_price);
  let a: Partial<DraftLine>;
  let b: Partial<DraftLine>;
  if (line.unit === "un" && qty >= 2 && unit !== null && /^\d+$/.test(line.quantity.trim())) {
    const qa = Math.ceil(qty / 2);
    a = { quantity: String(qa), line_total: centsToInput(qa * unit) };
    b = { quantity: String(qty - qa), line_total: centsToInput((qty - qa) * unit) };
  } else {
    const ta = Math.ceil(total / 2);
    a = { line_total: centsToInput(ta), unit_price: "" };
    b = { line_total: centsToInput(total - ta), unit_price: "", quantity: "1", unit: "un" };
  }
  const first: DraftLine = { ...line, ...a, touched: [...new Set<LineField>([...line.touched, "quantity", "line_total", "unit_price"])] };
  const second: DraftLine = {
    ...line,
    ...b,
    key: newKey(),
    id: undefined,
    source: undefined,
    discount: "",
    touched: ["raw_description", "quantity", "unit", "unit_price", "line_total"],
  };
  return [first, second];
}

export interface LineErrors {
  [field: string]: string;
}

export function validateLine(line: DraftLine): LineErrors {
  const errors: LineErrors = {};
  if (!line.raw_description.trim() && !line.product_name.trim()) errors.raw_description = "Indique o produto.";
  if (line.quantity.trim() && parseQuantity(line.quantity) === null) errors.quantity = "Quantidade inválida (ex.: 2 ou 0,456).";
  if (line.unit_price.trim() && parseEurToCents(line.unit_price) === null) errors.unit_price = "Preço inválido (ex.: 1,29).";
  if (line.line_total.trim() && parseEurToCents(line.line_total) === null) errors.line_total = "Total inválido (ex.: 3,49).";
  if (line.discount.trim() && (parseEurToCents(line.discount) ?? -1) < 0) errors.discount = "Desconto inválido.";
  return errors;
}

/** Only touched fields are sent for existing lines, so untouched values keep their confidence. */
export function toPatch(line: DraftLine): LinePatch {
  const patch: LinePatch = line.id ? { id: line.id } : {};
  const has = (f: LineField) => !line.id || line.touched.includes(f);
  if (has("raw_description")) patch.raw_description = line.raw_description.trim() || line.product_name.trim();
  if (has("quantity")) patch.quantity = line.quantity.trim() ? parseQuantity(line.quantity) : null;
  if (has("unit")) patch.unit = line.unit as LinePatch["unit"];
  if (has("unit_price")) patch.unit_price_cents = line.unit_price.trim() ? parseEurToCents(line.unit_price) : null;
  if (has("line_total")) patch.line_total_cents = line.line_total.trim() ? parseEurToCents(line.line_total) : null;
  if (has("discount")) patch.discount_cents = line.discount.trim() ? parseEurToCents(line.discount) : 0;
  if (line.touched.includes("product") && line.product_name.trim()) patch.product_name = line.product_name.trim();
  return patch;
}

export function lineNet(line: DraftLine): number | null {
  const total = parseEurToCents(line.line_total);
  if (total === null) return null;
  return total - (parseEurToCents(line.discount) ?? 0);
}

const offsetFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Lisbon", timeZoneName: "longOffset" });
const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Purchase times are Lisbon local time, whatever the device's time zone. */
export function lisbonParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function lisbonIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  const name = offsetFmt.formatToParts(new Date(`${date}T${t}:00Z`)).find((x) => x.type === "timeZoneName")?.value ?? "GMT";
  const offset = name === "GMT" ? "+00:00" : name.replace("GMT", "");
  return `${date}T${t}:00${offset}`;
}
