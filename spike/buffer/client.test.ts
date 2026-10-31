// Tests del cinturón de seguridad: nada del spike puede publicar pronto.
// Correr con: pnpm test:spike

import assert from "node:assert/strict";
import { test } from "node:test";
import { UnsafeOperationError, assertCannotPublish } from "./client.ts";

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) =>
  new Date(Date.now() + days * DAY).toISOString();
const create =
  "mutation C($input: CreatePostInput!) { createPost(input: $input) { __typename } }";

const unsafe = (query: string, variables: unknown) =>
  assert.throws(
    () => assertCannotPublish(query, variables),
    UnsafeOperationError,
  );

test("acepta un borrador agendado a más de 7 días", () => {
  assertCannotPublish(create, {
    input: { mode: "customScheduled", dueAt: inDays(30), saveToDraft: true },
  });
});

test("acepta lecturas", () => {
  assertCannotPublish("query { account { id } }", {});
});

test("rechaza publicar ya, en el próximo hueco o en la cola", () => {
  for (const mode of ["shareNow", "shareNext", "addToQueue"]) {
    unsafe(create, { input: { mode, dueAt: inDays(30) } });
  }
  unsafe(
    "mutation { createPost(input: { mode: shareNow }) { __typename } }",
    {},
  );
});

test("rechaza un dueAt cercano, inválido o ausente", () => {
  unsafe(create, { input: { mode: "customScheduled", dueAt: inDays(1) } });
  unsafe(create, { input: { mode: "customScheduled", dueAt: "mañana" } });
  unsafe(create, { input: { mode: "customScheduled" } });
});

test("rechaza mutaciones fuera de la lista blanca", () => {
  unsafe("mutation M($input: X!) { publishPost(input: $input) { id } }", {});
  unsafe("mutation { createIdea { id } }", {});
});

test("rechaza schedulingType distinto de automatic", () => {
  unsafe(create, {
    input: {
      schedulingType: "notification",
      mode: "customScheduled",
      dueAt: inDays(30),
    },
  });
});
