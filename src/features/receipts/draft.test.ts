import { describe, expect, it } from "vitest";
import { line } from "../../test/fixtures";
import { emptyLine, setField, toDraft, toPatch } from "./draft";

/** 2 × 0,85 = 1,70, as read. */
const read = () => toDraft(line());

describe("setField: the quantity, the unit price and the total are tied", () => {
  it("a new quantity works out the total from the unit price", () => {
    const next = setField(read(), "quantity", "3");
    expect(next.line_total).toBe("2,55");
    expect(next.touched).toEqual(["quantity", "line_total"]);
  });

  it("a new unit price works out the total", () => {
    expect(setField(read(), "unit_price", "1,00").line_total).toBe("2,00");
  });

  it("a new total works out the unit price", () => {
    const next = setField(read(), "line_total", "1,90");
    expect(next.unit_price).toBe("0,95");
    expect(next.touched).toEqual(["line_total", "unit_price"]);
  });

  it("works with a comma, and with a quantity in kg with three decimals", () => {
    const kg = { ...read(), unit: "kg", quantity: "1", unit_price: "10,00", line_total: "10,00" };
    expect(setField(kg, "quantity", "0,456").line_total).toBe("4,56");
  });

  it("rounds to the cent", () => {
    const next = setField({ ...read(), quantity: "3" }, "line_total", "3,49");
    expect(next.unit_price).toBe("1,16");
  });

  it("leaves the other figure alone while this one is empty, half written or invalid", () => {
    for (const value of ["", "1,", "abc"]) {
      expect(setField(read(), "line_total", value).unit_price).toBe("0,85");
      expect(setField(read(), "unit_price", value).line_total).toBe("1,70");
      expect(setField(read(), "quantity", value).line_total).toBe("1,70");
    }
  });

  it("does not work out the total from a quantity when there is no unit price to work from", () => {
    const next = setField({ ...read(), unit_price: "" }, "quantity", "3");
    expect(next.line_total).toBe("1,70");
    expect(next.touched).toEqual(["quantity"]);
  });

  it("does not work out a unit price from a total when there is no valid quantity", () => {
    const next = setField({ ...read(), quantity: "" }, "line_total", "1,90");
    expect(next.unit_price).toBe("0,85");
  });

  it("the unit, the discount and the product do not touch the figures", () => {
    for (const [field, value] of [["unit", "kg"], ["discount", "0,10"], ["product", "Leite"]] as const) {
      const next = setField(read(), field, value);
      expect([next.quantity, next.unit_price, next.line_total]).toEqual(["2", "0,85", "1,70"]);
    }
  });

  it("sends both figures, because both were touched", () => {
    const patch = toPatch(setField(read(), "line_total", "1,90"));
    expect(patch).toMatchObject({ id: "l1", line_total_cents: 190, unit_price_cents: 95 });
  });

  it("a line just added gets its unit price from the total", () => {
    const next = setField(emptyLine(), "line_total", "0,40");
    expect(next.unit_price).toBe("0,40");
  });
});
