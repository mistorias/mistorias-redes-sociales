// Punto de entrada del job `proponer`. Solo lee el entorno y llama al job;
// la lógica y sus tests están en src/jobs/propose.ts.

import { DEFAULT_STORY_FEED_URL } from "../feed/story-feed.ts";
import { createGitHubClient } from "../github/client.ts";
import { BROADCAST_SINCE, proposeBroadcasts } from "../jobs/propose.ts";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
};

const result = await proposeBroadcasts({
  feedUrl: process.env.SITE_FEED_URL || DEFAULT_STORY_FEED_URL,
  since: BROADCAST_SINCE,
  github: createGitHubClient({
    apiUrl: process.env.GITHUB_API_URL || "https://api.github.com",
    token: required("GH_TOKEN"),
    repository: required("GITHUB_REPOSITORY"),
  }),
});

for (const { slug, url } of result.opened)
  console.log(`Opened ${slug}: ${url}`);
for (const { slug, reason } of result.skipped) {
  console.log(`Skipped ${slug}: ${reason}`);
}
for (const { slug, error } of result.failed) {
  console.error(`::error title=${slug}::${error}`);
}
if (result.opened.length + result.skipped.length + result.failed.length === 0) {
  console.log(`No stories published since ${BROADCAST_SINCE}.`);
}
if (result.failed.length > 0) process.exitCode = 1;
