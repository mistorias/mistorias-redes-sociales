import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { readStoryFeed } from "../src/feed/story-feed.ts";
import { startFakeServer, type FakeServer } from "./support/fake-server.ts";

const FEED = JSON.parse(
  readFileSync(
    new URL("fixtures/feed/historias.json", import.meta.url),
    "utf8",
  ),
) as { items: Record<string, unknown>[] };

let server: FakeServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

const serve = async (status: number, body: unknown): Promise<string> => {
  server = await startFakeServer(() => ({ status, body }));
  return `${server.url}/historias.json`;
};

describe("readStoryFeed", () => {
  it("devuelve cada historia con los datos que usa la propuesta", async () => {
    const items = await readStoryFeed(await serve(200, FEED));

    expect(items).toEqual([
      {
        id: "2026-11-19-la-ultima-clase-de-matematica-de-ruth-fue-medir-el-techo-que-se-volo",
        url: "https://mistorias.pe/historias/2026-11-19-la-ultima-clase-de-matematica-de-ruth-fue-medir-el-techo-que-se-volo/",
        summary:
          "Al aula de Ruth, en Piura, el viento le voló una plancha, y su clase de matemática fue medir el techo con wincha y Pitágoras. La plata llega en diciembre, si todo sale bien.",
        datePublished: "2026-11-19T00:00:00.000Z",
        image: "https://mistorias.pe/_astro/principal.Bx3kQ9aZ_Z1abcd.jpg",
        imageAlt:
          "Ilustración de una alumna parada sobre una carpeta que sostiene una wincha hacia el hueco del techo de calamina, mientras la directora, sentada, la tensa y anota en un cuaderno",
        leadNewsTitle:
          "Cuatro regiones del norte adelantan el cierre escolar por El Niño",
        themes: [
          "fenomeno-el-nino",
          "infraestructura-educativa",
          "calendario-escolar",
          "secundaria",
          "piura",
        ],
      },
    ]);
  });

  it("acepta una historia sin imagen ni extensión: la propuesta decide", async () => {
    const [item] = FEED.items;
    const bare = { ...item, image: undefined, _mistorias: undefined };

    const items = await readStoryFeed(
      await serve(200, { ...FEED, items: [bare] }),
    );

    expect(items[0]?.image).toBeUndefined();
    expect(items[0]?.imageAlt).toBeUndefined();
    expect(items[0]?.leadNewsTitle).toBeUndefined();
  });

  it("falla con la URL y el código si el feed no responde 200", async () => {
    const url = await serve(404, "Not Found");

    await expect(readStoryFeed(url)).rejects.toThrow(
      `The story feed ${url} answered HTTP 404`,
    );
  });

  it("falla con un mensaje claro si el feed no tiene la forma esperada", async () => {
    const url = await serve(200, { items: [{ id: "sin-url" }] });

    await expect(readStoryFeed(url)).rejects.toThrow(
      `The story feed ${url} has an unexpected shape`,
    );
  });

  it("falla si el feed no es JSON", async () => {
    const url = await serve(200, "<html>");

    await expect(readStoryFeed(url)).rejects.toThrow(
      `The story feed ${url} is not JSON`,
    );
  });
});
