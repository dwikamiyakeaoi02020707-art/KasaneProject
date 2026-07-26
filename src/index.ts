import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { proxy } from "hono/proxy";
import { decrypt, hash } from "./sniffy.js";
import { db, url } from "./db.js";

const app = new Hono();
const PAGE_ROOT = path.resolve(process.cwd(), "page");

function resolvePagePath(reqPath: string) {
  const normalized =
    reqPath === "/"
      ? "/index"
      : reqPath.endsWith("/")
        ? `${reqPath}index`
        : reqPath;

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

app.get("/*", async (c) => {
  if (c.req.path.startsWith("/favicon")) {
    return proxy("https://avatars.githubusercontent.com/u/249699734");
  }
  if (c.req.path === "/cbt") {
    const path = c.req.url.replace(/^https?:\/\/[^/]+/, "");
    const ip =
      c.req.header("x-real-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0].trim();
    const ua = c.req.header("user-agent");
    const sec = `Sec-CH-UA: ${c.req.header("sec-ch-ua")}; Sec-CH-UA-Mobile: ${c.req.header("sec-ch-ua-mobile")}; Sec-CH-UA-Platform: ${c.req.header("sec-ch-ua-platform")}`;
    let success = false;
    const id = hash(`${path}:${ip}:${success}:${ua}:${sec}`);

    const param = c.req.query("code") || "";
    let res = {} as Response;
    try {
      res = c.redirect(decrypt(param));
      success = true;
    } catch {
      res = c.redirect("https://files.catbox.moe/ul5orj.mp4");
    }

    await db
      .insert(url)
      .values({
        id,
        success,
        modified: new Date().toISOString(),
        url: c.req.url.replace(/^https?:\/\/[^/]+/, ""),
        ip,
        ua,
        sec,
      })
      .onConflictDoUpdate({
        target: url.id,
        set: {
          modified: new Date().toISOString(),
        },
      });

    return res;
  }

  const pagePath = resolvePagePath(c.req.path);
  return streamFile(pagePath);
});

app.notFound(() => new Response(null, { status: 404 }));
app.onError((err) => {
  console.error(err);
  return new Response(null, { status: 500 });
});

export default app;
