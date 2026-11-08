import { describe, expect, it } from "vitest";
import { banned, BANNED } from "./banned";

describe("the words the product never uses", () => {
  it("F-257: catches the forms of poupar, economizar and the comparisons that rank markets", () => {
    for (const text of ["Vai poupar 5 €", "Poupa dinheiro", "Poupou 3 €", "Economizar no café", "O mais barato", "Está muito caro", "O seu orçamento", "Você gastou"]) {
      expect(text, text).toMatch(BANNED);
    }
  });

  it("F-257: leaves alone the words that only look like them", () => {
    for (const text of ["Carolina comprou 3 carros", "Poupança não aparece aqui", "Cerca de 1,80 € abaixo do que costuma pagar", "Caramelo"]) {
      expect(text, text).not.toMatch(BANNED);
    }
  });

  it("F-257: a screen adds its own words", () => {
    expect("excedeu o limite").not.toMatch(BANNED);
    expect("excedeu o limite").toMatch(banned("excedeu"));
  });
});
