// Cliente GraphQL mínimo para el spike de Buffer (#11).
//
// Tiene un cinturón de seguridad: rechaza, antes de enviar, cualquier
// operación que pudiera hacer visible un post a la audiencia. Ver
// assertCannotPublish.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const OUTPUT_DIR = join(import.meta.dirname, "salida");

// Un post agendado de prueba nunca queda a menos de esto en el futuro, y se
// borra apenas se relee. Así, aun si el borrado fallara, hay días para
// borrarlo a mano antes de que salga.
export const MIN_DAYS_AHEAD = 7;

const ALLOWED_MUTATIONS = new Set(["createPost", "editPost", "deletePost"]);
const FORBIDDEN_WORDS = ["shareNow", "shareNext", "addToQueue"];

export type Exchange = {
  label: string;
  request: { query: string; variables: unknown };
  response: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
  };
};

export type GraphQLResult = {
  status: number;
  headers: Record<string, string>;
  body: { data?: unknown; errors?: unknown } & Record<string, unknown>;
};

export class UnsafeOperationError extends Error {}

function readApiKey(): string {
  const key = process.env.BUFFER_API_KEY;
  if (!key) {
    throw new Error(
      "Falta BUFFER_API_KEY. Ponla en .env (ver .env.example) o en el entorno.",
    );
  }
  return key;
}

function minDueAt(): number {
  return Date.now() + MIN_DAYS_AHEAD * 24 * 60 * 60 * 1000;
}

function walk(value: unknown, visit: (key: string, v: unknown) => void): void {
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit));
  } else if (value !== null && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      visit(key, v);
      walk(v, visit);
    }
  }
}

// Reglas, en orden:
// 1. Solo mutaciones de la lista blanca (crear, editar, borrar posts).
// 2. Ningún modo que publique ya o en el próximo hueco de la cola.
// 3. Si hay `mode`, solo `customScheduled`, y entonces `dueAt` es obligatorio
//    y queda a MIN_DAYS_AHEAD días o más.
export function assertCannotPublish(query: string, variables: unknown): void {
  const isMutation = /^\s*mutation\b/.test(query);
  if (isMutation) {
    const called = [...query.matchAll(/\b(\w+)\s*\(\s*input\s*:/g)].map(
      (m) => m[1],
    );
    const notAllowed = called.filter((name) => !ALLOWED_MUTATIONS.has(name));
    if (called.length === 0 || notAllowed.length > 0) {
      throw new UnsafeOperationError(
        `Mutación no permitida en el spike: ${notAllowed.join(", ") || "?"}`,
      );
    }
  }

  const serialized = JSON.stringify(variables ?? {}) + query;
  for (const word of FORBIDDEN_WORDS) {
    if (serialized.includes(word)) {
      throw new UnsafeOperationError(
        `Palabra prohibida en la operación: ${word}`,
      );
    }
  }

  walk(variables, (key, v) => {
    if (key === "mode" && v !== "customScheduled") {
      throw new UnsafeOperationError(`mode no permitido: ${String(v)}`);
    }
    if (key === "schedulingType" && v !== "automatic") {
      throw new UnsafeOperationError(
        `schedulingType no permitido: ${String(v)}`,
      );
    }
    if (key === "dueAt") {
      const due = Date.parse(String(v));
      if (Number.isNaN(due) || due < minDueAt()) {
        throw new UnsafeOperationError(
          `dueAt ${String(v)} está a menos de ${MIN_DAYS_AHEAD} días`,
        );
      }
    }
  });

  let hasMode = false;
  let hasDueAt = false;
  walk(variables, (key) => {
    hasMode ||= key === "mode";
    hasDueAt ||= key === "dueAt";
  });
  if (hasMode && !hasDueAt) {
    throw new UnsafeOperationError("mode sin dueAt: Buffer elegiría la hora");
  }
}

function interestingHeaders(headers: Headers): Record<string, string> {
  const kept: Record<string, string> = {};
  headers.forEach((value, name) => {
    const n = name.toLowerCase();
    if (
      n.startsWith("ratelimit") ||
      n.startsWith("x-ratelimit") ||
      n.startsWith("x-rate-limit") ||
      n === "retry-after" ||
      n === "content-type" ||
      n === "date"
    ) {
      kept[n] = value;
    }
  });
  return kept;
}

export function save(fileName: string, content: unknown): string {
  const path = join(OUTPUT_DIR, fileName);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(content, null, 2) + "\n");
  return path;
}

let counter = 0;
const RUN_ID = new Date().toISOString().replaceAll(":", "").slice(0, 15);

export async function graphql(
  label: string,
  query: string,
  variables: unknown = {},
): Promise<GraphQLResult> {
  assertCannotPublish(query, variables);

  const url = process.env.BUFFER_API_URL ?? "https://api.buffer.com";
  const key = readApiKey();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  let body: GraphQLResult["body"];
  try {
    body = JSON.parse(text) as GraphQLResult["body"];
  } catch {
    body = { raw: text };
  }
  // La llave nunca viaja en la respuesta, pero por si acaso.
  // Solo con llaves largas: reemplazar una llave corta, como la de un test,
  // corrompería el resto del texto.
  const safeBody =
    key.length < 16
      ? body
      : (JSON.parse(
          JSON.stringify(body).replaceAll(key, "<BUFFER_API_KEY>"),
        ) as GraphQLResult["body"]);

  const result: GraphQLResult = {
    status: response.status,
    headers: interestingHeaders(response.headers),
    body: safeBody,
  };

  counter += 1;
  const exchange: Exchange = {
    label,
    request: { query, variables },
    response: result,
  };
  save(
    join(RUN_ID, `${String(counter).padStart(2, "0")}-${label}.json`),
    exchange,
  );
  return result;
}
