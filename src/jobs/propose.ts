// Job `proponer` (ADR 0003, paso 2): lee el feed y abre un PR de propuesta de
// difusión por cada historia publicada que todavía no tiene una.

import { readStoryFeed } from "../feed/story-feed.ts";
import type { GitHubClient } from "../github/client.ts";
import {
  ProposalError,
  buildProposal,
  proposalPath,
  type BuiltProposal,
} from "../proposal/proposal.ts";

// Las historias publicadas antes de este día no se proponen: el feed trae
// todas, y ninguna anterior al flujo tiene propuesta. Sin este tope, la
// primera corrida abriría un PR por cada historia vieja.
export const BROADCAST_SINCE = "2026-11-26T00:00:00.000Z";

const BASE_BRANCH = "main";

export type ProposeResult = {
  readonly opened: readonly { slug: string; url: string }[];
  readonly skipped: readonly { slug: string; reason: string }[];
  readonly failed: readonly { slug: string; error: string }[];
};

export type ProposeOptions = {
  readonly feedUrl: string;
  readonly since: string;
  readonly github: GitHubClient;
};

const branchFor = (slug: string) => `difusion/${slug}`;

const title = (slug: string) => `chore(difusion): se propone difundir ${slug}`;

const pullRequestBody = (
  slug: string,
  { rejectedThemes }: BuiltProposal,
): string =>
  [
    "## Qué",
    "",
    `Propuesta de difusión de la historia \`${slug}\` en Facebook, ` +
      `Instagram y X: \`${proposalPath(slug)}\`.`,
    "",
    "## Antes de hacerlo disponible",
    "",
    "- Revisa el texto de cada red en el archivo. Si hace falta, corrígelo " +
      "aquí mismo, en este PR.",
    "- Revisa la imagen y su texto alternativo.",
    "",
    "Hacer disponible (merge) este PR arranca la difusión: se crean los " +
      "borradores en Buffer y corre la ventana de cancelación. Si nadie " +
      "cancela la ejecución en Actions, los posts se agendan solos (ver " +
      "[ADR 0003](docs/adr/0003-flujo-de-difusion-automatica.md)).",
    ...(rejectedThemes.length > 0
      ? [
          "",
          "## Temas que no se volvieron hashtag",
          "",
          ...rejectedThemes.map((theme) => `- \`${theme}\``),
          "",
          "Solo pueden tener letras y dígitos, y no solo dígitos. Se corrigen " +
            "en el contenido de la historia.",
        ]
      : []),
  ].join("\n");

type Outcome =
  | { kind: "opened"; slug: string; url: string }
  | { kind: "skipped"; slug: string; reason: string }
  | { kind: "failed"; slug: string; error: string };

const proposeStory = async (
  github: GitHubClient,
  story: Parameters<typeof buildProposal>[0],
): Promise<Outcome> => {
  const slug = story.id;
  const path = proposalPath(slug);
  const branch = branchFor(slug);

  // Una difusión cancelada no se vuelve a proponer sola: su archivo ya está
  // en main (ADR 0003, paso 7).
  if (await github.fileExists(path, BASE_BRANCH)) {
    return { kind: "skipped", slug, reason: "already proposed" };
  }
  if (await github.hasOpenPullRequest(branch)) {
    return { kind: "skipped", slug, reason: "open pull request" };
  }

  let built: BuiltProposal;
  try {
    built = buildProposal(story);
  } catch (error) {
    if (error instanceof ProposalError) {
      return { kind: "failed", slug, error: error.message };
    }
    throw error;
  }

  const sha = await github.branchSha(BASE_BRANCH);
  await github.createOrResetBranch(branch, sha);
  await github.createFile({
    path,
    branch,
    content: `${JSON.stringify(built.proposal, null, 2)}\n`,
    message: title(slug),
  });
  const pull = await github.createPullRequest({
    title: title(slug),
    head: branch,
    base: BASE_BRANCH,
    body: pullRequestBody(slug, built),
  });
  return { kind: "opened", slug, url: pull.url };
};

export const proposeBroadcasts = async ({
  feedUrl,
  since,
  github,
}: ProposeOptions): Promise<ProposeResult> => {
  const stories = await readStoryFeed(feedUrl);
  const sinceTime = Date.parse(since);
  const candidates = stories.filter(
    (story) => Date.parse(story.datePublished) >= sinceTime,
  );

  // Una a una: son pocas por semana y así el orden de los PRs es el del feed.
  const outcomes: Outcome[] = [];
  for (const story of candidates) {
    outcomes.push(await proposeStory(github, story));
  }

  return {
    opened: outcomes.flatMap((o) =>
      o.kind === "opened" ? [{ slug: o.slug, url: o.url }] : [],
    ),
    skipped: outcomes.flatMap((o) =>
      o.kind === "skipped" ? [{ slug: o.slug, reason: o.reason }] : [],
    ),
    failed: outcomes.flatMap((o) =>
      o.kind === "failed" ? [{ slug: o.slug, error: o.error }] : [],
    ),
  };
};
