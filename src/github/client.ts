// Cliente mínimo de la API REST de GitHub: solo lo que necesita `proponer`
// para abrir un PR de propuesta en este repo. El token es el de la App
// **propuestas** (ADR 0004); nunca aparece en un error.

import { z } from "zod";

export type GitHubConfig = {
  readonly apiUrl: string;
  readonly token: string;
  // `owner/repo`, como lo da `GITHUB_REPOSITORY` en Actions.
  readonly repository: string;
};

export type PullRequest = { readonly number: number; readonly url: string };

export type GitHubClient = {
  readonly owner: string;
  fileExists: (path: string, ref: string) => Promise<boolean>;
  hasOpenPullRequest: (branch: string) => Promise<boolean>;
  branchSha: (branch: string) => Promise<string>;
  createOrResetBranch: (branch: string, sha: string) => Promise<void>;
  createFile: (file: {
    path: string;
    branch: string;
    content: string;
    message: string;
  }) => Promise<void>;
  createPullRequest: (pull: {
    title: string;
    head: string;
    base: string;
    body: string;
  }) => Promise<PullRequest>;
};

export class GitHubError extends Error {}

const RefSchema = z.object({ object: z.object({ sha: z.string().min(1) }) });
const PullsSchema = z.array(z.object({ number: z.number() }));
const PullSchema = z.object({ number: z.number(), html_url: z.url() });

export const createGitHubClient = (config: GitHubConfig): GitHubClient => {
  const [owner, repo] = config.repository.split("/");
  if (!owner || !repo) {
    throw new GitHubError(
      `The repository must be owner/repo, got "${config.repository}"`,
    );
  }
  const base = `${config.apiUrl.replace(/\/$/, "")}/repos/${owner}/${repo}`;

  const request = async (
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${config.token}`,
        "x-github-api-version": "2022-11-28",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  const fail = (method: string, path: string, response: Response) =>
    new GitHubError(
      `GitHub answered HTTP ${response.status} to ${method} ${path}`,
    );

  const json = async <T>(
    method: string,
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
  ): Promise<T> => {
    const response = await request(method, path, body);
    if (!response.ok) throw fail(method, path, response);
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      throw new GitHubError(
        `GitHub answered ${method} ${path} with an unexpected shape: ${z.prettifyError(parsed.error)}`,
      );
    }
    return parsed.data;
  };

  const expectOk = async (method: string, path: string, body: unknown) => {
    const response = await request(method, path, body);
    if (!response.ok) throw fail(method, path, response);
  };

  const encode = encodeURIComponent;

  return {
    owner,

    fileExists: async (path, ref) => {
      const route = `/contents/${path}?ref=${encode(ref)}`;
      const response = await request("GET", route);
      if (response.status === 404) return false;
      if (!response.ok) throw fail("GET", route, response);
      return true;
    },

    hasOpenPullRequest: async (branch) => {
      const pulls = await json(
        "GET",
        `/pulls?state=open&head=${encode(`${owner}:${branch}`)}`,
        PullsSchema,
      );
      return pulls.length > 0;
    },

    branchSha: async (branch) =>
      (await json("GET", `/git/ref/heads/${branch}`, RefSchema)).object.sha,

    // La rama es del bot. Si quedó de una propuesta cerrada sin merge, se
    // reinicia desde main en lugar de fallar.
    createOrResetBranch: async (branch, sha) => {
      const route = "/git/refs";
      const response = await request("POST", route, {
        ref: `refs/heads/${branch}`,
        sha,
      });
      if (response.status === 422) {
        await expectOk("PATCH", `/git/refs/heads/${branch}`, {
          sha,
          force: true,
        });
        return;
      }
      if (!response.ok) throw fail("POST", route, response);
    },

    createFile: async ({ path, branch, content, message }) =>
      expectOk("PUT", `/contents/${path}`, {
        message,
        branch,
        content: Buffer.from(content, "utf8").toString("base64"),
      }),

    createPullRequest: async (pull) => {
      const created = await json("POST", "/pulls", PullSchema, {
        ...pull,
        maintainer_can_modify: true,
      });
      return { number: created.number, url: created.html_url };
    },
  };
};
