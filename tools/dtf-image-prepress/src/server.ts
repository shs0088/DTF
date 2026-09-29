import { createApiHandler } from "./api";

const port = Number(process.env.PORT ?? "8788");

Bun.serve({
  port,
  fetch: createApiHandler,
});

console.log(`DTF Image Prepress API listening on http://127.0.0.1:${port}`);
