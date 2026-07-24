import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("../../public/", import.meta.url));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

export function serveStatic(request, response) {
  return new Promise((resolve) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
    const safePath = normalize(requestUrl.pathname).replace(/^(\.\.[/\\])+/, "");
    const resolvedPath = join(publicDir, safePath === "/" ? "index.html" : safePath);

    if (!resolvedPath.startsWith(publicDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      resolve();
      return;
    }

    try {
      const fileStat = statSync(resolvedPath);
      if (!fileStat.isFile()) {
        throw new Error("Not a file");
      }

      response.writeHead(200, {
        "content-type": contentTypes[extname(resolvedPath)] ?? "application/octet-stream",
        "content-length": fileStat.size
      });

      createReadStream(resolvedPath).pipe(response).on("finish", resolve);
    } catch {
      response.writeHead(404, {
        "content-type": "text/plain; charset=utf-8"
      });
      response.end("Not found");
      resolve();
    }
  });
}

