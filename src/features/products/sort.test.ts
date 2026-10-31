import { describe, expect, it } from "vitest";
import { productItem } from "../../test/fixtures";
import { parseOrder, sortProducts } from "./sort";

const names = (items: ReturnType<typeof productItem>[]) => items.map((p) => p.name);
const items = [
  productItem({ id: "1", name: "Banana", purchases: 5, spent_cents: 700 }),
  productItem({ id: "2", name: "Água", purchases: 2, spent_cents: 900 }),
  productItem({ id: "3", name: "Arroz", purchases: 5, spent_cents: 300 }),
  productItem({ id: "4", name: "Ovos", purchases: 9, spent_cents: 100 }),
];

describe("order of the products, in the client (spec 012, D-T4)", () => {
  it("F-197: «Mais comprados» is the default: the most purchases first, then by name", () => {
    expect(names(sortProducts(items, "compras"))).toEqual(["Ovos", "Arroz", "Banana", "Água"]);
  });

  it("F-197: «Mais gastos» puts the highest spending first", () => {
    expect(names(sortProducts(items, "gasto"))).toEqual(["Água", "Banana", "Arroz", "Ovos"]);
  });

  it("F-197: «A–Z» follows the Portuguese order, with accents next to their letter", () => {
    expect(names(sortProducts(items, "az"))).toEqual(["Água", "Arroz", "Banana", "Ovos"]);
  });

  it("F-197: sorting does not change the list it was given", () => {
    const before = names(items);
    sortProducts(items, "az");
    expect(names(items)).toEqual(before);
  });

  it("F-197: the order in the URL is one of three, and anything else is the default", () => {
    expect(parseOrder("gasto")).toBe("gasto");
    expect(parseOrder("az")).toBe("az");
    expect(parseOrder("compras")).toBe("compras");
    expect(parseOrder("xyz")).toBe("compras");
    expect(parseOrder(null)).toBe("compras");
  });
});
