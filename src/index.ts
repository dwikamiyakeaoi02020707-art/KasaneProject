import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { proxy } from "hono/proxy";
import { decrypt } from "./sniffy.js";

const app = new Hono();
const PAGE_ROOT = path.resolve(process.cwd(), "page");

function resolvePagePath(reqPath: string) {
  const normalized =
    reqPath === "/" ? "/index" : reqPath.endsWith("/") ? `${reqPath}index` : reqPath;

  // Prevent absolute-path issues and weird traversal
  const safeRelative = normalized.replace(/^\/+/, "");
  return path.resolve(PAGE_ROOT, `${safeRelative}.html`);
}

function streamFile(filePath: string) {
  try {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      return new Response(null, { status: 404 });
    }

    const stats = fs.statSync(absolutePath);
    const nodeStream = fs.createReadStream(absolutePath);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Length": String(stats.size),
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}

app.get("/*", (c) => {
  if (c.req.path.startsWith('/favicon')) {
    return proxy('https://avatars.githubusercontent.com/u/249699734');
  }
  if (c.req.path === "/cbt") {
    const param = c.req.query("code") ?? "";
    try {
      return c.redirect(decrypt(param));
    } catch {
      return c.redirect("https://files.catbox.moe/ul5orj.mp4");
    }
  }

  const pagePath = resolvePagePath(c.req.path);
  return streamFile(pagePath);
});

app.notFound(() => new Response(null, { status: 404 }));
app.onError(() => new Response(null, { status: 500 }));

export default app;
