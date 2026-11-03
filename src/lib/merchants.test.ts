import { describe, expect, it } from "vitest";
import { merchants } from "../test/fixtures";
import { KNOWN_MERCHANTS, MERCHANT_CHOICES, MERCHANT_OPTIONS, merchantName, merchantStyle } from "./merchants";

describe("the table of the stores (approved design, canvas «Mercados»)", () => {
  const TABLE = {
    CONTINENTE: { name: "Continente", initials: "C", background: "#E30613", letter: "#FFFFFF", border: "#E30613" },
    PINGO_DOCE: { name: "Pingo Doce", initials: "P", background: "#6BB743", letter: "#14290A", border: "#6BB743" },
    LIDL: { name: "Lidl", initials: "L", background: "#0050AA", letter: "#FFCC00", border: "#0050AA" },
    MERCADONA: { name: "Mercadona", initials: "M", background: "#F4F3EF", letter: "#006F42", border: "#006F42" },
    EL_CORTE_INGLES: { name: "El Corte Inglés", initials: "EC", background: "#004731", letter: "#FFFFFF", border: "#004731" },
    ALDI: { name: "Aldi", initials: "A", background: "#002D72", letter: "#FFFFFF", border: "#002D72" },
    AUCHAN: { name: "Auchan", initials: "AU", background: "#F4F3EF", letter: "#DF0613", border: "#DF0613" },
  };

  it.each(Object.entries(TABLE))("%s has the name, initials and colours of the design", (code, expected) => {
    expect(merchantStyle(code)).toMatchObject(expected);
  });

  it("covers every code the API can return, and nothing else", () => {
    expect([...KNOWN_MERCHANTS].sort()).toEqual(Object.keys(TABLE).sort());
  });

  it("agrees with GET /v1/merchants: the same codes and the same names, in the same order", () => {
    expect(MERCHANT_OPTIONS).toEqual(merchants.map(({ id, name }) => [id, name]));
  });

  it("no two stores share their initials, and Auchan differs from Continente by shape: light with a border, «AU» against «C»", () => {
    const initials = KNOWN_MERCHANTS.map((code) => merchantStyle(code).initials);
    expect(new Set(initials).size).toBe(initials.length);
    const [continente, auchan] = [merchantStyle("CONTINENTE"), merchantStyle("AUCHAN")];
    expect(auchan.background).not.toBe(continente.background);
    expect(auchan.border).not.toBe(auchan.background);
    expect(auchan.initials).not.toBe(continente.initials);
  });

  it("an unknown, new, empty or inherited code gives the neutral «?» and never throws", () => {
    for (const code of ["UNKNOWN", "INTERMARCHE", "", null, undefined, "toString", "__proto__", "constructor"]) {
      expect(merchantStyle(code), String(code)).toMatchObject({ initials: "?", background: "#E6E2D9", letter: "#5A564F" });
    }
  });
});

describe("names and options", () => {
  it("names a known store by its code; a store without a parser shows the name read from the receipt", () => {
    expect(merchantName("EL_CORTE_INGLES")).toBe("El Corte Inglés");
    expect(merchantName("UNKNOWN")).toBe("Outra loja");
    expect(merchantName("UNKNOWN", "Talho do Zé")).toBe("Talho do Zé");
    expect(merchantName(null, "Talho do Zé")).toBe("Talho do Zé");
    expect(merchantName(null)).toBe("Loja por identificar");
    expect(merchantName("INTERMARCHE")).toBe("INTERMARCHE");
  });

  it("the stores to pick are the known chains in the design's order; «Outra loja» is only in the choices of a receipt under review", () => {
    expect(MERCHANT_OPTIONS.map(([code]) => code)).toEqual(["CONTINENTE", "PINGO_DOCE", "LIDL", "AUCHAN", "ALDI", "MERCADONA", "EL_CORTE_INGLES"]);
    expect(MERCHANT_CHOICES.at(-1)).toEqual(["UNKNOWN", "Outra loja"]);
    expect(MERCHANT_CHOICES).toHaveLength(MERCHANT_OPTIONS.length + 1);
  });
});
