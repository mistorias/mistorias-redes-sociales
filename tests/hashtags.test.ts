import { describe, expect, it } from "vitest";
import { pickHashtags, toHashtag } from "../src/proposal/hashtags.ts";

describe("toHashtag", () => {
  it("pasa un tema en kebab-case a camelCase con # al frente", () => {
    expect(toHashtag("fenomeno-el-nino")).toBe("#fenomenoElNino");
  });

  it("deja igual un tema de una sola palabra", () => {
    expect(toHashtag("piura")).toBe("#piura");
  });

  it("acepta letras con tilde y eñe, que son letras", () => {
    expect(toHashtag("educación-en-españa")).toBe("#educaciónEnEspaña");
  });

  it("acepta dígitos junto a letras", () => {
    expect(toHashtag("covid-19")).toBe("#covid19");
  });

  it.each([
    ["solo dígitos", "2026"],
    ["espacios", "fenomeno el nino"],
    ["signos", "ley-30.432"],
    ["guiones dobles", "fenomeno--el-nino"],
    ["guion al final", "piura-"],
    ["vacío", ""],
  ])("rechaza un tema con %s", (_caso, theme) => {
    expect(toHashtag(theme)).toBeUndefined();
  });
});

describe("pickHashtags", () => {
  it("toma los dos primeros temas", () => {
    expect(pickHashtags(["fenomeno-el-nino", "secundaria", "piura"])).toEqual({
      hashtags: ["#fenomenoElNino", "#secundaria"],
      rejected: [],
    });
  });

  it("salta y reporta el tema que no se puede convertir", () => {
    expect(pickHashtags(["2026", "secundaria", "piura"])).toEqual({
      hashtags: ["#secundaria", "#piura"],
      rejected: ["2026"],
    });
  });

  it("sin temas no hay hashtags", () => {
    expect(pickHashtags([])).toEqual({ hashtags: [], rejected: [] });
  });
});
