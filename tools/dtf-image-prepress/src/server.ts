import { createApiHandler } from "./api";

const port = Number(process.env.PORT ?? "8788");
const hostname = process.env.HOST ?? "127.0.0.1";

Bun.serve({
  hostname,
  port,
  fetch: createApiHandler,
});

console.log(`DTF Image Prepress API listening on http://${hostname}:${port}`);
