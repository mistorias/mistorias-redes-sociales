import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { GitHubError, createGitHubClient } from "../src/github/client.ts";
import {
  startFakeServer,
  type FakeResponse,
  type FakeServer,
  type RecordedRequest,
} from "./support/fake-server.ts";

const GITHUB = JSON.parse(
  readFileSync(new URL("fixtures/github.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

const REPO = "/repos/mistorias/mistorias-redes-sociales";
const TOKEN = "ghs_token-de-prueba";

let server: FakeServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

const clientFor = async (
  handler: (request: RecordedRequest) => FakeResponse,
) => {
  server = await startFakeServer(handler);
  return createGitHubClient({
    apiUrl: server.url,
    token: TOKEN,
    repository: "mistorias/mistorias-redes-sociales",
  });
};

const only = (status: number, body: unknown) => () => ({ status, body });

const lastRequest = () => {
  const request = server?.requests.at(-1);
  return {
    route: `${request?.method} ${decodeURIComponent(request?.path ?? "")}`,
    body: request?.body,
  };
};

describe("createGitHubClient", () => {
  it("rechaza un repositorio que no es owner/repo", () => {
    expect(() =>
      createGitHubClient({
        apiUrl: "http://x",
        token: "t",
        repository: "solo",
      }),
    ).toThrow(new GitHubError('The repository must be owner/repo, got "solo"'));
  });

  it("expone el dueño del repositorio", async () => {
    const github = await clientFor(only(200, {}));

    expect(github.owner).toBe("mistorias");
  });

  it("envía el token como Bearer y nunca lo devuelve en un error", async () => {
    const github = await clientFor(only(401, GITHUB.badCredentials));

    const error = await github.branchSha("main").catch((e: unknown) => e);

    expect(server?.requests[0]?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(String(error)).toBe(
      "Error: GitHub answered HTTP 401 to GET /git/ref/heads/main",
    );
    expect(String(error)).not.toContain(TOKEN);
  });

  describe("fileExists", () => {
    it("es true si GitHub devuelve el archivo", async () => {
      const github = await clientFor(only(200, GITHUB.content));

      expect(await github.fileExists("difusiones/a.json", "main")).toBe(true);
      expect(lastRequest().route).toBe(
        `GET ${REPO}/contents/difusiones/a.json?ref=main`,
      );
    });

    it("es false si GitHub responde 404", async () => {
      const github = await clientFor(only(404, GITHUB.notFound));

      expect(await github.fileExists("difusiones/a.json", "main")).toBe(false);
    });

    it("falla con cualquier otro código", async () => {
      const github = await clientFor(only(500, {}));

      await expect(
        github.fileExists("difusiones/a.json", "main"),
      ).rejects.toThrow(
        "GitHub answered HTTP 500 to GET /contents/difusiones/a.json?ref=main",
      );
    });
  });

  describe("hasOpenPullRequest", () => {
    it("busca los PRs abiertos de la rama del dueño", async () => {
      const github = await clientFor(only(200, GITHUB.pullsOpen));

      expect(await github.hasOpenPullRequest("difusion/a")).toBe(true);
      expect(lastRequest().route).toBe(
        `GET ${REPO}/pulls?state=open&head=mistorias:difusion/a`,
      );
    });

    it("es false si no hay ninguno", async () => {
      const github = await clientFor(only(200, []));

      expect(await github.hasOpenPullRequest("difusion/a")).toBe(false);
    });
  });

  describe("branchSha", () => {
    it("devuelve el sha de la rama", async () => {
      const github = await clientFor(only(200, GITHUB.refMain));

      expect(await github.branchSha("main")).toBe(
        "ef809d5c0f2b6d6a1d1f0b1f6b5b9c1e3a2d4f60",
      );
    });

    it("falla con un mensaje claro si GitHub responde con otra forma", async () => {
      const github = await clientFor(only(200, { object: {} }));

      await expect(github.branchSha("main")).rejects.toThrow(
        "GitHub answered GET /git/ref/heads/main with an unexpected shape",
      );
    });
  });

  describe("createOrResetBranch", () => {
    it("crea la rama en el sha dado", async () => {
      const github = await clientFor(only(201, GITHUB.refMain));

      await github.createOrResetBranch("difusion/a", "abc");

      expect(lastRequest()).toEqual({
        route: `POST ${REPO}/git/refs`,
        body: { ref: "refs/heads/difusion/a", sha: "abc" },
      });
    });

    it("si la rama ya existe, la reinicia en el sha dado", async () => {
      const github = await clientFor(({ method }) =>
        method === "POST"
          ? { status: 422, body: GITHUB.refExists }
          : { body: GITHUB.refMain },
      );

      await github.createOrResetBranch("difusion/a", "abc");

      expect(lastRequest()).toEqual({
        route: `PATCH ${REPO}/git/refs/heads/difusion/a`,
        body: { sha: "abc", force: true },
      });
    });

    it("falla con cualquier otro código", async () => {
      const github = await clientFor(only(403, {}));

      await expect(
        github.createOrResetBranch("difusion/a", "abc"),
      ).rejects.toThrow("GitHub answered HTTP 403 to POST /git/refs");
    });
  });

  it("createFile sube el contenido en base64 a la rama", async () => {
    const github = await clientFor(only(201, GITHUB.contentCreated));

    await github.createFile({
      path: "difusiones/a.json",
      branch: "difusion/a",
      content: "{}\n",
      message: "mensaje",
    });

    expect(lastRequest()).toEqual({
      route: `PUT ${REPO}/contents/difusiones/a.json`,
      body: { message: "mensaje", branch: "difusion/a", content: "e30K" },
    });
  });

  it("createPullRequest abre el PR y devuelve su número y enlace", async () => {
    const github = await clientFor(only(201, GITHUB.pullCreated));

    const pull = await github.createPullRequest({
      title: "título",
      head: "difusion/a",
      base: "main",
      body: "cuerpo",
    });

    expect(pull).toEqual({
      number: 22,
      url: "https://github.com/mistorias/mistorias-redes-sociales/pull/22",
    });
    expect(lastRequest().body).toEqual({
      title: "título",
      head: "difusion/a",
      base: "main",
      body: "cuerpo",
      maintainer_can_modify: true,
    });
  });
});
