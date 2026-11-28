// Servidor HTTP falso para los tests de integración (ADR 0005). El código
// bajo prueba hace llamadas HTTP de verdad; solo cambia la URL base.

import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";

export type RecordedRequest = {
  readonly method: string;
  readonly path: string;
  readonly headers: IncomingMessage["headers"];
  readonly body: unknown;
};

export type FakeResponse = {
  readonly status?: number;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
};

export type Handler = (request: RecordedRequest) => FakeResponse;

export type FakeServer = {
  readonly url: string;
  readonly requests: readonly RecordedRequest[];
  close: () => Promise<void>;
};

const readBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const startFakeServer = async (
  handler: Handler,
): Promise<FakeServer> => {
  const requests: RecordedRequest[] = [];
  const server = createServer((request, response) => {
    void readBody(request).then((body) => {
      const recorded: RecordedRequest = {
        method: request.method ?? "GET",
        path: request.url ?? "/",
        headers: request.headers,
        body,
      };
      requests.push(recorded);
      const reply = handler(recorded);
      const payload =
        typeof reply.body === "string"
          ? reply.body
          : JSON.stringify(reply.body ?? null);
      response.writeHead(reply.status ?? 200, {
        "content-type": "application/json",
        ...reply.headers,
      });
      response.end(payload);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
};
