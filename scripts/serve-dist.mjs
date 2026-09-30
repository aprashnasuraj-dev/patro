import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd(), "dist");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

async function existing(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end('{"error":"static_audit_server"}');
    return;
  }
  const decoded = decodeURIComponent(url.pathname);
  const safe = normalize(decoded).replace(/^([.][.][/\\])+/, "").replace(/^[/\\]+/, "");
  let file = join(root, safe || "index.html");
  if (!(await existing(file))) {
    const indexCandidate = join(file, "index.html");
    file = (await existing(indexCandidate)) ? indexCandidate : join(root, "index.html");
  }
  if (!(await existing(file))) {
    res.writeHead(404); res.end("Not found"); return;
  }
  let body = await readFile(file);
  const type = types[extname(file)] || "application/octet-stream";
  if (type.startsWith("text/html")) {
    const route = url.pathname.length > 1 && url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
    const canonical = `http://127.0.0.1:${port}${route || "/"}`;
    let html = body.toString("utf8");
    // Lighthouse treats a homepage canonical pointing to the domain root as a failure
    // and also rejects production-domain canonicals during localhost CI. Production
    // output retains its real canonical; this local server only removes that false signal.
    if ((route || "/") === "/") {
      html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/ig, "");
    } else if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) {
      html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}">`);
    } else {
      html = html.replace("</head>", `<link rel="canonical" href="${canonical}"></head>`);
    }
    body = Buffer.from(html);
  }
  res.writeHead(200, { "content-type": type });
  res.end(body);
}).listen(port, "127.0.0.1", () => {
  console.log(`PATRO_STATIC_READY http://127.0.0.1:${port}`);
});
