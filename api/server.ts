// Vercel serverless function entry — wraps the TanStack Start SSR fetch handler.
// The build produces a Web-standard { fetch } handler in dist/server/server.js.
// @ts-ignore — built artifact, only exists after `bun run build`
import handler from "../dist/server/server.js";

export const config = {
  runtime: "nodejs.x",
};

export default async function (request: Request): Promise<Response> {
  return handler.fetch(request);
}
