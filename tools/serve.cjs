// Local-only static server; understands a repository prefix to test GitHub Pages paths.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const prefix = process.env.SITE_PREFIX || "";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".md": "text/plain; charset=utf-8",
};
http
  .createServer((req, res) => {
    let url;
    try {
      url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (prefix && !url.startsWith(prefix + "/")) {
      res.writeHead(404).end();
      return;
    }
    url = url.slice(prefix.length);
    if (url.endsWith("/")) url += "index.html";
    const file = path.resolve(root, "." + url);
    if (
      !file.startsWith(root + path.sep) ||
      path
        .relative(root, file)
        .split(path.sep)
        .some((p) => p.startsWith("."))
    ) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    });
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Renuncia definitiva: http://127.0.0.1:${port}${prefix}/`),
  );
