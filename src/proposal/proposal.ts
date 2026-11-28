// Propuesta de difusión: el texto de cada red armado desde el feed, sin IA
// (ADR 0003). Queda en `difusiones/<slug>.json` y se revisa en su PR.

import type { StoryFeedItem } from "../feed/story-feed.ts";
import { pickHashtags } from "./hashtags.ts";
import { X_MAX_LENGTH, xLength } from "./x-length.ts";

export type Network = "facebook" | "instagram" | "x";

// Las claves son las del registro de difusión de mistorias-contenido
// (docs/registro-de-difusion.md), para que `registrar` las copie tal cual.
export type ProposedPost = {
  readonly network: Network;
  readonly text: string;
  readonly url: string;
  readonly utmCampaign: string;
};

export type Proposal = {
  readonly story: string;
  readonly image: { readonly url: string; readonly altText: string };
  readonly posts: readonly ProposedPost[];
};

export type BuiltProposal = {
  readonly proposal: Proposal;
  readonly rejectedThemes: readonly string[];
};

export class ProposalError extends Error {}

export const proposalPath = (slug: string): string => `difusiones/${slug}.json`;

const linkWithUtm = (storyUrl: string, network: Network, slug: string) => {
  const url = new URL(storyUrl);
  url.searchParams.set("utm_source", network);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", slug);
  return url.toString();
};

const availableLine = (link: string) =>
  `🤩 Ya está disponible la última historia en ${link}`;

// Facebook es la base; Instagram usa la misma plantilla con su propio UTM.
const facebookText = (
  summary: string,
  link: string,
  leadNewsTitle: string,
  hashtags: readonly string[],
): string =>
  [
    summary,
    availableLine(link),
    `➡️ Noticia de la semana: ${leadNewsTitle}`,
    ...(hashtags.length > 0 ? [hashtags.join(" ")] : []),
  ].join("\n\n");

// X: sin la noticia, sin líneas en blanco, y cada hashtag solo si cabe
// entero en el conteo de X.
const xText = (
  summary: string,
  link: string,
  hashtags: readonly string[],
): string => {
  const base = `${summary}\n${availableLine(link)}`;
  const fitting = hashtags.reduce<readonly string[]>((kept, hashtag) => {
    const candidate = [...kept, hashtag];
    return xLength(`${base}\n${candidate.join(" ")}`) <= X_MAX_LENGTH
      ? candidate
      : kept;
  }, []);
  return fitting.length > 0 ? `${base}\n${fitting.join(" ")}` : base;
};

const missingData = (story: StoryFeedItem): readonly string[] => [
  ...(story.image ? [] : ["the feed has no image"]),
  ...(story.imageAlt
    ? []
    : ["the feed has no image alt text (_mistorias.imageAlt)"]),
  ...(story.leadNewsTitle
    ? []
    : ["the feed has no lead news title (_mistorias.primeraNoticia)"]),
];

export const buildProposal = (story: StoryFeedItem): BuiltProposal => {
  const slug = story.id;
  const problems = missingData(story);
  const { image, imageAlt, leadNewsTitle } = story;
  // Sin imagen no se propone: Instagram no publica sin ella y las tres redes
  // salen con la misma. Sin la noticia, la plantilla quedaría a medias.
  if (problems.length > 0 || !image || !imageAlt || !leadNewsTitle) {
    throw new ProposalError(`Cannot propose ${slug}: ${problems.join("; ")}`);
  }

  const { hashtags, rejected } = pickHashtags(story.themes);
  const post = (network: Network, text: (link: string) => string) => {
    const url = linkWithUtm(story.url, network, slug);
    return { network, text: text(url), url, utmCampaign: slug };
  };

  const xPost = post("x", (link) => xText(story.summary, link, hashtags));
  const xTextLength = xLength(xPost.text);
  if (xTextLength > X_MAX_LENGTH) {
    throw new ProposalError(
      `Cannot propose ${slug}: the X text is ${xTextLength} characters long, over ${X_MAX_LENGTH}`,
    );
  }

  const posts = [
    post("facebook", (link) =>
      facebookText(story.summary, link, leadNewsTitle, hashtags),
    ),
    post("instagram", (link) =>
      facebookText(story.summary, link, leadNewsTitle, hashtags),
    ),
    xPost,
  ];

  return {
    proposal: { story: slug, image: { url: image, altText: imageAlt }, posts },
    rejectedThemes: rejected,
  };
};
