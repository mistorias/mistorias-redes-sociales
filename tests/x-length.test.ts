import { describe, expect, it } from "vitest";
import { xLength } from "../src/proposal/x-length.ts";

describe("xLength", () => {
  it("cuenta 1 por cada letra latina, con o sin tilde", () => {
    expect(xLength("Piura")).toBe(5);
    expect(xLength("año récord")).toBe(10);
  });

  it("cuenta 1 por cada salto de línea", () => {
    expect(xLength("a\nb")).toBe(3);
  });

  it("cuenta 23 por cada enlace, sin importar su largo", () => {
    expect(
      xLength(
        "ver https://mistorias.pe/historias/una-historia-de-nombre-largo/" +
          "?utm_source=x&utm_medium=social&utm_campaign=una-historia",
      ),
    ).toBe(27);
    expect(xLength("ver https://a.pe")).toBe(27);
  });

  it("cuenta 2 por cada emoji, aunque tenga selector de variación", () => {
    expect(xLength("🤩")).toBe(2);
    expect(xLength("➡️")).toBe(2);
  });

  it("cuenta 2 por un emoji compuesto de varios puntos de código", () => {
    expect(xLength("👩‍🏫")).toBe(2);
  });

  it("cuenta 2 por cada carácter fuera de los rangos latinos", () => {
    expect(xLength("日本")).toBe(4);
  });

  it("no toma # ni dígitos por emoji", () => {
    expect(xLength("#covid19")).toBe(8);
  });
});
