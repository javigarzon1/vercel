// Vercel Node serverless function — adapts Node req/res <-> Web Request/Response
// so we can call the TanStack Start fetch handler from dist/server/server.js.
import type { IncomingMessage, ServerResponse } from "node:http";
// @ts-ignore — built artifact, only exists after `bun run build`
import handler from "../dist/server/server.js";

export const config = {
  runtime: "nodejs",
};

function buildRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? "localhost";
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ?? "https";
  const url = `${proto}://${host}${req.url ?? "/"}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
    else if (v != null) headers.set(k, String(v));
  }

  const method = (req.method ?? "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(url, {
    method,
    headers,
    body: hasBody ? (req as unknown as ReadableStream) : undefined,
    // @ts-ignore — Node fetch needs duplex when streaming a body
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

export default async function (req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const request = buildRequest(req);
    const response = await handler.fetch(request);
    await sendResponse(res, response);
  } catch (err) {
    console.error("Server function failed:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain");
    }
    res.end("Internal Server Error");
  }
}
