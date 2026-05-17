#!/usr/bin/env node

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "..", "..");
const port = 4317;
const host = "127.0.0.1";

const staticTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
]);

const dataRoutes = new Map([
  ["/data/project-map.json", "docs/architecture/project-map.json"],
  ["/data/architecture-confidence-history.json", "docs/architecture/architecture-confidence-history.json"],
  ["/data/vault-score-history.json", "docs/architecture/vault-score-history.json"],
  ["/data/dev-integrity-review-history.json", "docs/reviews/dev-integrity-review-history.json"],
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

async function serveData(response, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const stat = statSync(absolutePath, { throwIfNoEntry: false });

  if (!stat?.isFile()) {
    sendJson(response, 200, {
      missing: true,
      path: relativePath,
    });
    return;
  }

  try {
    const data = await readFile(absolutePath, "utf8");
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(data);
  } catch (error) {
    sendJson(response, 500, {
      error: "failed_to_read_data_file",
      path: relativePath,
    });
  }
}

async function serveStatic(response, requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const absolutePath = path.resolve(toolDir, `.${safePath}`);

  if (!absolutePath.startsWith(toolDir)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  const stat = statSync(absolutePath, { throwIfNoEntry: false });
  if (!stat?.isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = path.extname(absolutePath);
  const contentType = staticTypes.get(extension) || "application/octet-stream";
  const body = await readFile(absolutePath);
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (dataRoutes.has(url.pathname)) {
    await serveData(response, dataRoutes.get(url.pathname));
    return;
  }

  await serveStatic(response, url.pathname);
});

server.listen(port, host, () => {
  console.log(`AuthToolkit Dev Integrity dashboard running at http://localhost:${port}`);
});
