// Feed de historias de mistorias.pe (`/historias.json`, JSON Feed 1.1). Es el
// disparador de la difusión: una historia que aparece ahí ya está publicada
// (ADR 0003). El contrato lo fija el ADR 0033 de mistorias-web.

import { z } from "zod";

export const DEFAULT_STORY_FEED_URL = "https://mistorias.pe/historias.json";

// Solo los campos que usa la propuesta. Lo demás del feed se ignora, así que
// agregar un campo allá no rompe nada aquí.
const FeedItemSchema = z.object({
  id: z.string().min(1),
  url: z.url(),
  summary: z.string().min(1),
  date_published: z.iso.datetime({ offset: true }),
  image: z.url().optional(),
  tags: z.array(z.string()),
  _mistorias: z
    .object({
      primeraNoticia: z.string().min(1).optional(),
      imageAlt: z.string().min(1).optional(),
    })
    .optional(),
});

const FeedSchema = z.object({ items: z.array(FeedItemSchema) });

export type StoryFeedItem = {
  readonly id: string;
  readonly url: string;
  readonly summary: string;
  readonly datePublished: string;
  readonly image: string | undefined;
  readonly imageAlt: string | undefined;
  readonly leadNewsTitle: string | undefined;
  readonly themes: readonly string[];
};

const toStoryFeedItem = (
  item: z.infer<typeof FeedItemSchema>,
): StoryFeedItem => ({
  id: item.id,
  url: item.url,
  summary: item.summary,
  datePublished: item.date_published,
  image: item.image,
  imageAlt: item._mistorias?.imageAlt,
  leadNewsTitle: item._mistorias?.primeraNoticia,
  themes: item.tags,
});

export const readStoryFeed = async (
  url: string,
): Promise<readonly StoryFeedItem[]> => {
  const response = await fetch(url, {
    headers: { accept: "application/feed+json, application/json" },
  });
  if (!response.ok) {
    throw new Error(`The story feed ${url} answered HTTP ${response.status}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(`The story feed ${url} is not JSON`);
  }

  const parsed = FeedSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `The story feed ${url} has an unexpected shape: ${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data.items.map(toStoryFeedItem);
};
