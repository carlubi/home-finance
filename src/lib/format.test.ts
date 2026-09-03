import { describe, expect, it } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("separa los miles con puntos y los decimales con comas", () => {
    expect(formatMoney(1234.56)).toContain("1.234,56");
  });

  it("mantiene el formato español en importes grandes", () => {
    expect(formatMoney(1234567.89)).toContain("1.234.567,89");
  });
});
