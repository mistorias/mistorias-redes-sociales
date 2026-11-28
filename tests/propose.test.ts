import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { createGitHubClient } from "../src/github/client.ts";
import { proposeBroadcasts } from "../src/jobs/propose.ts";
import {
  startFakeServer,
  type FakeResponse,
  type FakeServer,
  type RecordedRequest,
} from "./support/fake-server.ts";

const fixture = (path: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`fixtures/${path}`, import.meta.url), "utf8"),
  ) as unknown;
const GITHUB = fixture("github.json") as Record<string, unknown>;

const FEED = fixture("feed/historias.json") as {
  items: Record<string, unknown>[];
};
const SLUG =
  "2026-11-19-la-ultima-clase-de-matematica-de-ruth-fue-medir-el-techo-que-se-volo";
const REPO = "/repos/mistorias/mistorias-redes-sociales";
const BRANCH = `difusion/${SLUG}`;
const FILE = `difusiones/${SLUG}.json`;
const TOKEN = "ghs_token-de-prueba";

let servers: FakeServer[] = [];
afterEach(async () => {
  await Promise.all(servers.map((server) => server.close()));
  servers = [];
});

const start = async (handler: (r: RecordedRequest) => FakeResponse) => {
  const server = await startFakeServer(handler);
  servers.push(server);
  return server;
};

type GitHubState = {
  proposalOnMain?: boolean;
  openPull?: boolean;
  branchExists?: boolean;
  unauthorized?: boolean;
};

// Imita las rutas de la API REST de GitHub que usa `proponer`.
const gitHubHandler =
  (state: GitHubState) =>
  ({ method, path }: RecordedRequest): FakeResponse => {
    if (state.unauthorized) {
      return { status: 401, body: GITHUB.badCredentials };
    }
    const route = `${method} ${decodeURIComponent(path)}`;
    switch (route) {
      case `GET ${REPO}/contents/${FILE}?ref=main`:
        return state.proposalOnMain
          ? { body: GITHUB.content }
          : { status: 404, body: GITHUB.notFound };
      case `GET ${REPO}/pulls?state=open&head=mistorias:${BRANCH}`:
        return {
          body: state.openPull ? GITHUB.pullsOpen : [],
        };
      case `GET ${REPO}/git/ref/heads/main`:
        return { body: GITHUB.refMain };
      case `POST ${REPO}/git/refs`:
        return state.branchExists
          ? { status: 422, body: GITHUB.refExists }
          : { status: 201, body: GITHUB.refMain };
      case `PATCH ${REPO}/git/refs/heads/${BRANCH}`:
        return { body: GITHUB.refMain };
      case `PUT ${REPO}/contents/${FILE}`:
        return { status: 201, body: GITHUB.contentCreated };
      case `POST ${REPO}/pulls`:
        return { status: 201, body: GITHUB.pullCreated };
      default:
        return { status: 404, body: GITHUB.notFound };
    }
  };

const setUp = async (
  state: GitHubState = {},
  feed: unknown = FEED,
  since = "2026-11-19T00:00:00.000Z",
) => {
  const feedServer = await start(() => ({ body: feed }));
  const github = await start(gitHubHandler(state));
  const run = () =>
    proposeBroadcasts({
      feedUrl: `${feedServer.url}/historias.json`,
      since,
      github: createGitHubClient({
        apiUrl: github.url,
        token: TOKEN,
        repository: "mistorias/mistorias-redes-sociales",
      }),
    });
  return { github, run };
};

const calls = (server: FakeServer) =>
  server.requests.map((r) => `${r.method} ${decodeURIComponent(r.path)}`);

describe("proposeBroadcasts", () => {
  it("abre un PR de propuesta con difusiones/<slug>.json para una historia nueva", async () => {
    const { github, run } = await setUp();

    const result = await run();

    expect(result).toEqual({
      opened: [
        {
          slug: SLUG,
          url: "https://github.com/mistorias/mistorias-redes-sociales/pull/22",
        },
      ],
      skipped: [],
      failed: [],
    });
    expect(calls(github)).toEqual([
      `GET ${REPO}/contents/${FILE}?ref=main`,
      `GET ${REPO}/pulls?state=open&head=mistorias:${BRANCH}`,
      `GET ${REPO}/git/ref/heads/main`,
      `POST ${REPO}/git/refs`,
      `PUT ${REPO}/contents/${FILE}`,
      `POST ${REPO}/pulls`,
    ]);
  });

  it("crea la rama desde main y sube la propuesta en JSON", async () => {
    const { github, run } = await setUp();

    await run();

    const [, , , createRef, putFile] = github.requests;
    expect(createRef?.body).toEqual({
      ref: `refs/heads/${BRANCH}`,
      sha: "ef809d5c0f2b6d6a1d1f0b1f6b5b9c1e3a2d4f60",
    });
    const put = putFile?.body as {
      message: string;
      branch: string;
      content: string;
    };
    expect(put.branch).toBe(BRANCH);
    expect(put.message).toBe(`chore(difusion): se propone difundir ${SLUG}`);
    const proposal = JSON.parse(
      Buffer.from(put.content, "base64").toString("utf8"),
    ) as { story: string; image: unknown; posts: { network: string }[] };
    expect(proposal.story).toBe(SLUG);
    expect(proposal.image).toEqual({
      url: "https://mistorias.pe/_astro/principal.Bx3kQ9aZ_Z1abcd.jpg",
      altText:
        "Ilustración de una alumna parada sobre una carpeta que sostiene una wincha hacia el hueco del techo de calamina, mientras la directora, sentada, la tensa y anota en un cuaderno",
    });
    expect(proposal.posts.map((post) => post.network)).toEqual([
      "facebook",
      "instagram",
      "x",
    ]);
  });

  it("abre el PR contra main, con título y una descripción para revisar", async () => {
    const { github, run } = await setUp();

    await run();

    const pull = github.requests.at(-1)?.body as {
      title: string;
      head: string;
      base: string;
      body: string;
      maintainer_can_modify: boolean;
    };
    expect(pull.title).toBe(`chore(difusion): se propone difundir ${SLUG}`);
    expect(pull.head).toBe(BRANCH);
    expect(pull.base).toBe("main");
    expect(pull.body).toContain("Hacer disponible (merge) este PR");
    expect(pull.body).toContain("ventana de cancelación");
    expect(pull.body).toContain(`\`difusiones/${SLUG}.json\``);
  });

  it("envía el token como Bearer y nunca lo devuelve en un error", async () => {
    const { github, run } = await setUp({ unauthorized: true });

    const error = await run().catch((e: unknown) => e);

    expect(github.requests[0]?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(String(error)).toContain("GitHub answered HTTP 401");
    expect(String(error)).not.toContain(TOKEN);
  });

  it("no propone una historia que ya tiene difusiones/<slug>.json en main", async () => {
    const { github, run } = await setUp({ proposalOnMain: true });

    const result = await run();

    expect(result.skipped).toEqual([
      { slug: SLUG, reason: "already proposed" },
    ]);
    expect(result.opened).toEqual([]);
    expect(calls(github)).toEqual([`GET ${REPO}/contents/${FILE}?ref=main`]);
  });

  it("no propone una historia que ya tiene un PR abierto", async () => {
    const { github, run } = await setUp({ openPull: true });

    const result = await run();

    expect(result.skipped).toEqual([
      { slug: SLUG, reason: "open pull request" },
    ]);
    expect(github.requests).toHaveLength(2);
  });

  it("si la rama quedó de una propuesta cerrada, la reinicia desde main", async () => {
    const { github, run } = await setUp({ branchExists: true });

    const result = await run();

    expect(result.opened).toHaveLength(1);
    const reset = github.requests.find((r) => r.method === "PATCH");
    expect(reset?.body).toEqual({
      sha: "ef809d5c0f2b6d6a1d1f0b1f6b5b9c1e3a2d4f60",
      force: true,
    });
  });

  it("ignora las historias anteriores a la fecha de inicio", async () => {
    const { github, run } = await setUp({}, FEED, "2026-11-26T00:00:00.000Z");

    const result = await run();

    expect(result).toEqual({ opened: [], skipped: [], failed: [] });
    expect(github.requests).toEqual([]);
  });

  it("reporta la historia sin imagen y no abre su PR", async () => {
    const [item] = FEED.items;
    const { github, run } = await setUp(
      {},
      { ...FEED, items: [{ ...item, image: undefined }] },
    );

    const result = await run();

    expect(result.failed).toEqual([
      {
        slug: SLUG,
        error: `Cannot propose ${SLUG}: the feed has no image`,
      },
    ]);
    expect(calls(github)).toEqual([
      `GET ${REPO}/contents/${FILE}?ref=main`,
      `GET ${REPO}/pulls?state=open&head=mistorias:${BRANCH}`,
    ]);
  });

  it("señala en el PR los temas que no se pudieron volver hashtag", async () => {
    const [item] = FEED.items;
    const { github, run } = await setUp(
      {},
      { ...FEED, items: [{ ...item, tags: ["2026", "piura"] }] },
    );

    await run();

    const pull = github.requests.at(-1)?.body as { body: string };
    expect(pull.body).toContain("`2026`");
  });
});
