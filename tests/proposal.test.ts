import { describe, expect, it } from "vitest";
import type { StoryFeedItem } from "../src/feed/story-feed.ts";
import {
  ProposalError,
  buildProposal,
  proposalPath,
} from "../src/proposal/proposal.ts";

const SLUG =
  "2026-11-19-la-ultima-clase-de-matematica-de-ruth-fue-medir-el-techo-que-se-volo";
const SUMMARY =
  "Al aula de Ruth, en Piura, el viento le voló una plancha, y su clase de matemática fue medir el techo con wincha y Pitágoras. La plata llega en diciembre, si todo sale bien.";
const STORY_URL = `https://mistorias.pe/historias/${SLUG}/`;

const story = (overrides?: Partial<StoryFeedItem>): StoryFeedItem => ({
  id: SLUG,
  url: STORY_URL,
  summary: SUMMARY,
  datePublished: "2026-11-19T00:00:00.000Z",
  image: "https://mistorias.pe/_astro/principal.abc.jpg",
  imageAlt: "Una alumna mide el techo del aula con una wincha",
  leadNewsTitle:
    "Cuatro regiones del norte adelantan el cierre escolar por El Niño",
  themes: ["fenomeno-el-nino", "infraestructura-educativa", "piura"],
  ...overrides,
});

const link = (network: string) =>
  `${STORY_URL}?utm_source=${network}&utm_medium=social&utm_campaign=${SLUG}`;

describe("buildProposal", () => {
  it("arma Facebook e Instagram con la misma plantilla y su propio UTM", () => {
    const { proposal } = buildProposal(story());

    expect(proposal.posts[0]).toEqual({
      network: "facebook",
      text:
        `${SUMMARY}\n\n` +
        `🤩 Ya está disponible la última historia en ${link("facebook")}\n\n` +
        "➡️ Noticia de la semana: Cuatro regiones del norte adelantan el cierre escolar por El Niño\n\n" +
        "#fenomenoElNino #infraestructuraEducativa",
      url: link("facebook"),
      utmCampaign: SLUG,
    });
    expect(proposal.posts[1]).toEqual({
      network: "instagram",
      text:
        `${SUMMARY}\n\n` +
        `🤩 Ya está disponible la última historia en ${link("instagram")}\n\n` +
        "➡️ Noticia de la semana: Cuatro regiones del norte adelantan el cierre escolar por El Niño\n\n" +
        "#fenomenoElNino #infraestructuraEducativa",
      url: link("instagram"),
      utmCampaign: SLUG,
    });
  });

  it("arma X sin la noticia, sin líneas en blanco y solo con los hashtags que caben", () => {
    // Con los dos hashtags suma 283 según X; con el primero, 257.
    const { proposal } = buildProposal(story());

    expect(proposal.posts[2]).toEqual({
      network: "x",
      text:
        `${SUMMARY}\n` +
        `🤩 Ya está disponible la última historia en ${link("x")}\n` +
        "#fenomenoElNino",
      url: link("x"),
      utmCampaign: SLUG,
    });
  });

  it("en X va el segundo hashtag si el primero no cabe y el segundo sí", () => {
    const { proposal } = buildProposal(
      story({
        themes: ["infraestructura-educativa-rural-del-norte-peruano", "piura"],
      }),
    );

    expect(proposal.posts[2]?.text).toBe(
      `${SUMMARY}\n` +
        `🤩 Ya está disponible la última historia en ${link("x")}\n` +
        "#piura",
    );
  });

  it("en X no va ningún hashtag si ninguno cabe", () => {
    const { proposal } = buildProposal(
      story({
        themes: [
          "infraestructura-educativa-rural-del-norte-peruano",
          "calendario-escolar-adelantado-por-el-fenomeno-el-nino",
        ],
      }),
    );

    expect(proposal.posts[2]?.text).toBe(
      `${SUMMARY}\n` +
        `🤩 Ya está disponible la última historia en ${link("x")}`,
    );
  });

  it("sin temas válidos, Facebook no lleva la línea de hashtags", () => {
    const { proposal, rejectedThemes } = buildProposal(
      story({ themes: ["2026"] }),
    );

    expect(proposal.posts[0]?.text).toBe(
      `${SUMMARY}\n\n` +
        `🤩 Ya está disponible la última historia en ${link("facebook")}\n\n` +
        "➡️ Noticia de la semana: Cuatro regiones del norte adelantan el cierre escolar por El Niño",
    );
    expect(rejectedThemes).toEqual(["2026"]);
  });

  it("guarda la imagen publicada y su texto alternativo", () => {
    const { proposal } = buildProposal(story());

    expect(proposal.story).toBe(SLUG);
    expect(proposal.image).toEqual({
      url: "https://mistorias.pe/_astro/principal.abc.jpg",
      altText: "Una alumna mide el techo del aula con una wincha",
    });
  });

  it("falla con todos los motivos si faltan la imagen y la noticia", () => {
    const build = () =>
      buildProposal(
        story({
          image: undefined,
          imageAlt: undefined,
          leadNewsTitle: undefined,
        }),
      );

    expect(build).toThrow(ProposalError);
    expect(build).toThrow(
      `Cannot propose ${SLUG}: the feed has no image; ` +
        "the feed has no image alt text (_mistorias.imageAlt); " +
        "the feed has no lead news title (_mistorias.primeraNoticia)",
    );
  });

  it("falla si el texto de X pasa de 280 aun sin hashtags", () => {
    expect(() => buildProposal(story({ summary: "a".repeat(240) }))).toThrow(
      `Cannot propose ${SLUG}: the X text is 308 characters long, over 280`,
    );
  });
});

describe("proposalPath", () => {
  it("es difusiones/<slug>.json", () => {
    expect(proposalPath(SLUG)).toBe(`difusiones/${SLUG}.json`);
  });
});
