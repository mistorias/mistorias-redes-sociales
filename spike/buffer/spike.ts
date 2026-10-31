// Spike #11: confirma con la API real de Buffer lo que los ADR 0003 y 0004
// dan por supuesto. Uso: ver spike/buffer/README.md.
//
// Ningún paso puede hacer visible un post: los borradores no se publican y
// el único agendado de prueba queda a días en el futuro y se borra al
// releerlo. El cliente rechaza cualquier otra cosa (ver client.ts).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MIN_DAYS_AHEAD,
  OUTPUT_DIR,
  graphql,
  save,
  type GraphQLResult,
} from "./client.ts";

// --- Introspección ---------------------------------------------------------

type TypeRef = { kind: string; name: string | null; ofType: TypeRef | null };
type Field = {
  name: string;
  args: { name: string; type: TypeRef }[];
  type: TypeRef;
};
type SchemaType = {
  kind: string;
  name: string;
  fields: Field[] | null;
  inputFields: { name: string; type: TypeRef }[] | null;
  enumValues: { name: string }[] | null;
  possibleTypes: { name: string }[] | null;
};
type Schema = {
  queryType: { name: string };
  mutationType: { name: string } | null;
  types: SchemaType[];
};

const TYPE_REF = `
  fragment TypeRef on __Type {
    kind name
    ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
  }`;

const INTROSPECTION = `
  query Introspection {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        kind name
        fields(includeDeprecated: true) {
          name
          args { name type { ...TypeRef } }
          type { ...TypeRef }
        }
        inputFields { name type { ...TypeRef } }
        enumValues(includeDeprecated: true) { name }
        possibleTypes { name }
      }
    }
  }
  ${TYPE_REF}`;

const SCHEMA_FILE = join(OUTPUT_DIR, "esquema.json");

async function loadSchema(): Promise<Schema> {
  if (existsSync(SCHEMA_FILE)) {
    return JSON.parse(readFileSync(SCHEMA_FILE, "utf8")) as Schema;
  }
  const result = await graphql("introspeccion", INTROSPECTION);
  const data = dataOf(result) as { __schema: Schema } | undefined;
  if (!data) throw new Error("La introspección falló; ver salida/.");
  save("esquema.json", data.__schema);
  return data.__schema;
}

function typeByName(schema: Schema, name: string): SchemaType | undefined {
  return schema.types.find((t) => t.name === name);
}

function render(ref: TypeRef): string {
  if (ref.kind === "NON_NULL") return `${render(ref.ofType as TypeRef)}!`;
  if (ref.kind === "LIST") return `[${render(ref.ofType as TypeRef)}]`;
  return ref.name ?? "?";
}

function named(ref: TypeRef): TypeRef {
  return ref.ofType ? named(ref.ofType) : ref;
}

function rootField(schema: Schema, root: "query" | "mutation", name: string) {
  const rootName =
    root === "query" ? schema.queryType.name : schema.mutationType?.name;
  return typeByName(schema, rootName ?? "")?.fields?.find(
    (f) => f.name === name,
  );
}

function argType(field: Field | undefined, arg: string): string | undefined {
  const found = field?.args.find((a) => a.name === arg);
  return found ? render(found.type) : undefined;
}

function inputFieldNames(schema: Schema, typeName: string): Set<string> {
  const clean = typeName.replace(/[!\[\]]/g, "");
  return new Set(typeByName(schema, clean)?.inputFields?.map((f) => f.name));
}

function pick<T extends Record<string, unknown>>(
  value: T,
  allowed: Set<string>,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([k]) => allowed.has(k)),
  ) as Partial<T>;
}

// Buffer puede llamar `id` o `postId` al campo; si el esquema no lo dice,
// se manda `id`.
function idInput(schema: Schema, inputType: string, id: string) {
  const picked = pick({ id, postId: id }, inputFieldNames(schema, inputType));
  return Object.keys(picked).length > 0 ? picked : { id };
}

// Pide todos los campos escalares de un tipo, y un nivel más dentro de los
// objetos, para ver de una vez qué devuelve Buffer (pregunta 2).
function selectAll(schema: Schema, typeName: string, depth = 1): string {
  const type = typeByName(schema, typeName);
  if (!type) return "__typename";
  if (type.kind === "UNION" || type.kind === "INTERFACE") {
    const parts = (type.possibleTypes ?? []).map(
      (p) => `... on ${p.name} { ${selectAll(schema, p.name, depth)} }`,
    );
    return ["__typename", ...parts].join(" ");
  }
  const parts = ["__typename"];
  for (const field of type.fields ?? []) {
    if (field.args.some((a) => a.type.kind === "NON_NULL")) continue;
    const inner = named(field.type);
    if (inner.kind === "SCALAR" || inner.kind === "ENUM") {
      parts.push(field.name);
    } else if (depth > 0 && inner.name && !inner.name.endsWith("Connection")) {
      parts.push(
        `${field.name} { ${selectAll(schema, inner.name, depth - 1)} }`,
      );
    }
  }
  return parts.join(" ");
}

function payloadSelection(schema: Schema, field: Field | undefined): string {
  const typeName = field ? named(field.type).name : null;
  return typeName ? selectAll(schema, typeName, 2) : "__typename";
}

// --- Utilidades ------------------------------------------------------------

function dataOf(result: GraphQLResult): unknown {
  return result.body.data;
}

function report(title: string, value: unknown): void {
  console.log(`\n## ${title}\n`);
  console.log(
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}. Ver spike/buffer/README.md.`);
  return value;
}

function findPost(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id === "string" && "status" in obj) return obj;
  for (const v of Object.values(obj)) {
    const found = findPost(v);
    if (found) return found;
  }
  return undefined;
}

const CREATED_FILE = join(OUTPUT_DIR, "creados.json");

function readCreated(): string[] {
  if (!existsSync(CREATED_FILE)) return [];
  return JSON.parse(readFileSync(CREATED_FILE, "utf8")) as string[];
}

function rememberCreated(id: string): void {
  save("creados.json", [...new Set([...readCreated(), id])]);
}

function forgetCreated(id: string): void {
  save(
    "creados.json",
    readCreated().filter((x) => x !== id),
  );
}

function farFutureIso(): string {
  const days = Number(process.env.BUFFER_SPIKE_DAYS_AHEAD ?? 30);
  const ms = Math.max(days, MIN_DAYS_AHEAD + 1) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

const SPIKE_TEXT =
  "[Prueba interna de Mistorias — no publicar] Spike #11. " +
  "Si ves esto en la cola de Buffer, bórralo.";

// --- Comandos --------------------------------------------------------------

async function esquema(): Promise<void> {
  const schema = await loadSchema();
  const mutations =
    typeByName(schema, schema.mutationType?.name ?? "")?.fields?.map(
      (f) => `${f.name}(${f.args.map((a) => `${a.name}: ${render(a.type)}`)})`,
    ) ?? [];
  const queries =
    typeByName(schema, schema.queryType.name)?.fields?.map(
      (f) => `${f.name}(${f.args.map((a) => `${a.name}: ${render(a.type)}`)})`,
    ) ?? [];
  const describe = (name: string) => {
    const t = typeByName(schema, name);
    return (
      t?.fields?.map((f) => `${f.name}: ${render(f.type)}`) ??
      t?.inputFields?.map((f) => `${f.name}: ${render(f.type)}`) ??
      t?.enumValues?.map((v) => v.name) ??
      t?.possibleTypes?.map((p) => p.name) ??
      "no existe"
    );
  };
  const summary = {
    queries,
    mutations,
    Post: describe("Post"),
    PostStatus: describe("PostStatus"),
    CreatePostInput: describe("CreatePostInput"),
    EditPostInput: describe("EditPostInput"),
    DeletePostInput: describe("DeletePostInput"),
    PostActionPayload: describe("PostActionPayload"),
    DeletePostPayload: describe("DeletePostPayload"),
    ShareMode: describe("ShareMode"),
    SchedulingType: describe("SchedulingType"),
  };
  save("esquema-resumen.json", summary);
  report("Resumen del esquema (salida/esquema-resumen.json)", summary);
}

async function canales(): Promise<void> {
  const schema = await loadSchema();
  const account = await graphql(
    "organizaciones",
    `
      query {
        account {
          organizations {
            id
            name
          }
        }
      }
    `,
  );
  report("Organizaciones", dataOf(account) ?? account.body);

  const orgId =
    process.env.BUFFER_ORGANIZATION_ID ??
    (
      dataOf(account) as
        { account?: { organizations?: { id: string }[] } } | undefined
    )?.account?.organizations?.[0]?.id;
  if (!orgId)
    throw new Error("Sin organización; define BUFFER_ORGANIZATION_ID.");

  const field = rootField(schema, "query", "channels");
  const inputType = argType(field, "input") ?? "ChannelsInput!";
  const result = await graphql(
    "canales",
    `query Channels($input: ${inputType}) {
       channels(input: $input) { ${selectAll(schema, "Channel", 0)} }
     }`,
    { input: { organizationId: orgId } },
  );
  report(
    "Canales: elige uno y ponlo en BUFFER_SPIKE_CHANNEL_ID",
    dataOf(result) ?? result.body,
  );
}

async function readPost(schema: Schema, id: string, label: string) {
  const field = rootField(schema, "query", "post");
  const inputType = argType(field, "input") ?? "PostInput!";
  const result = await graphql(
    label,
    `query Post($input: ${inputType}) {
       post(input: $input) { ${selectAll(schema, "Post", 1)} }
     }`,
    { input: idInput(schema, inputType, id) },
  );
  return { result, post: findPost(dataOf(result)) };
}

async function deletePost(schema: Schema, id: string, label: string) {
  const field = rootField(schema, "mutation", "deletePost");
  const inputType = argType(field, "input") ?? "DeletePostInput!";
  const result = await graphql(
    label,
    `mutation DeletePost($input: ${inputType}) {
       deletePost(input: $input) { ${payloadSelection(schema, field)} }
     }`,
    { input: idInput(schema, inputType, id) },
  );
  if (!result.body.errors) forgetCreated(id);
  return result;
}

async function createScheduledDraft(schema: Schema, channelId: string) {
  const field = rootField(schema, "mutation", "createPost");
  const inputType = argType(field, "input") ?? "CreatePostInput!";
  // El borrador también lleva una hora lejana: si Buffer ignorara
  // saveToDraft, el post quedaría a días y no en el próximo hueco.
  const wanted = {
    text: SPIKE_TEXT,
    channelId,
    schedulingType: "automatic",
    mode: "customScheduled",
    dueAt: farFutureIso(),
    saveToDraft: true,
  };
  const input = pick(wanted, inputFieldNames(schema, inputType));
  if (input.saveToDraft !== true || input.text === undefined) {
    throw new Error("CreatePostInput no acepta saveToDraft o text; no sigo.");
  }
  const result = await graphql(
    "crear-borrador",
    `mutation CreatePost($input: ${inputType}) {
       createPost(input: $input) { ${payloadSelection(schema, field)} }
     }`,
    { input },
  );
  const post = findPost(dataOf(result));
  if (post) rememberCreated(post.id as string);
  return { result, post };
}

// Pregunta 1: ¿la API pasa un borrador a la cola sin recrearlo?
async function borradorACola(): Promise<void> {
  const schema = await loadSchema();
  const channelId = requireEnv("BUFFER_SPIKE_CHANNEL_ID");
  const findings: Record<string, unknown> = {};

  const created = await createScheduledDraft(schema, channelId);
  findings.creado = created.post ?? created.result.body;
  if (!created.post) {
    report("No se pudo crear el borrador", created.result.body);
    return;
  }
  const draftId = created.post.id as string;
  let finalId = draftId;

  try {
    const reread = await readPost(schema, draftId, "releer-borrador");
    findings.releido = reread.post ?? reread.result.body;

    const edit = rootField(schema, "mutation", "editPost");
    if (!edit) {
      findings.editPost = "no existe en el esquema";
    } else {
      const inputType = argType(edit, "input") ?? "EditPostInput!";
      const allowed = inputFieldNames(schema, inputType);
      const wanted = {
        id: draftId,
        postId: draftId,
        text: SPIKE_TEXT,
        channelId,
        schedulingType: "automatic",
        mode: "customScheduled",
        dueAt: farFutureIso(),
        saveToDraft: false,
      };
      const input = pick(wanted, allowed);
      findings.editPostInputAceptado = [...allowed];
      const result = await graphql(
        "borrador-a-agendado",
        `mutation EditPost($input: ${inputType}) {
           editPost(input: $input) { ${payloadSelection(schema, edit)} }
         }`,
        { input },
      );
      const after = findPost(dataOf(result));
      findings.editado = after ?? result.body;
      if (after) finalId = after.id as string;
      if (after && finalId !== draftId) rememberCreated(finalId);

      const check = await readPost(schema, finalId, "releer-agendado");
      findings.releidoTrasAgendar = check.post ?? check.result.body;
      findings.mismoId = finalId === draftId;
      findings.pasoACola = check.post?.status;
    }
  } finally {
    const ids = [...new Set([draftId, finalId])];
    findings.borrado = [];
    for (const id of ids) {
      const del = await deletePost(schema, id, `borrar-${id}`);
      (findings.borrado as unknown[]).push({ id, respuesta: del.body });
    }
    save("pregunta-1.json", findings);
    report("Pregunta 1 (salida/pregunta-1.json)", findings);
    const left = readCreated();
    if (left.length > 0) {
      console.error(
        `\n⚠️  Quedaron posts sin borrar: ${left.join(", ")}. ` +
          "Corre `pnpm spike:buffer limpiar` o bórralos en Buffer.",
      );
      process.exitCode = 1;
    }
  }
}

// Pregunta 2: ¿qué campos dicen si un post salió o falló, y cuándo?
// Solo lee posts que ya existen; no crea nada.
async function estados(): Promise<void> {
  const schema = await loadSchema();
  const orgId = requireEnv("BUFFER_ORGANIZATION_ID");
  const statuses =
    typeByName(schema, "PostStatus")?.enumValues?.map((v) => v.name) ?? [];
  const field = rootField(schema, "query", "posts");
  const inputType = argType(field, "input") ?? "PostsInput!";
  const findings: Record<string, unknown> = { PostStatus: statuses };
  const hasFirst = argType(field, "first") !== undefined;

  for (const status of statuses) {
    const result = await graphql(
      `posts-${status}`,
      `query Posts($input: ${inputType}${hasFirst ? ", $first: Int" : ""}) {
         posts(input: $input${hasFirst ? ", first: $first" : ""}) {
           edges { node { ${selectAll(schema, "Post", 1)} } }
         }
       }`,
      {
        input: { organizationId: orgId, filter: { status: [status] } },
        first: 3,
      },
    );
    findings[status] = dataOf(result) ?? result.body;
  }
  save("pregunta-2.json", findings);
  report("Pregunta 2 (salida/pregunta-2.json)", findings);
}

// Pregunta 4: ¿qué devuelve al superar el límite? Consume la cuota de lectura
// hasta recibir 429: córrelo al final, cuando ya no necesites la API hoy.
async function limite(): Promise<void> {
  if (process.argv[3] !== "--consumir-cuota") {
    console.log(
      "Este paso gasta la cuota de requests hasta recibir 429.\n" +
        "Si estás seguro: pnpm spike:buffer limite --consumir-cuota",
    );
    return;
  }
  const max = Number(process.env.BUFFER_SPIKE_MAX_REQUESTS ?? 200);
  for (let i = 1; i <= max; i += 1) {
    const result = await graphql(
      "limite",
      `
        query {
          account {
            id
          }
        }
      `,
    );
    const remaining = Object.entries(result.headers)
      .filter(([k]) => k.includes("remaining"))
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.log(`${i}: HTTP ${result.status} ${remaining}`);
    if (result.status === 429 || result.body.errors) {
      save("pregunta-4.json", { intentos: i, ultima: result });
      report("Pregunta 4 (salida/pregunta-4.json)", result);
      return;
    }
  }
  console.log(`No hubo 429 tras ${max} requests.`);
}

async function limpiar(): Promise<void> {
  const schema = await loadSchema();
  const ids = readCreated();
  if (ids.length === 0) console.log("No hay posts del spike pendientes.");
  for (const id of ids) {
    const result = await deletePost(schema, id, `limpiar-${id}`);
    report(`Borrar ${id}`, result.body);
  }
}

const commands: Record<string, () => Promise<void>> = {
  esquema,
  canales,
  "borrador-a-cola": borradorACola,
  estados,
  limite,
  limpiar,
};

const name = process.argv[2] ?? "";
const command = commands[name];
if (!command) {
  console.log(`Uso: pnpm spike:buffer <${Object.keys(commands).join("|")}>`);
  process.exitCode = 1;
} else {
  await command();
}
