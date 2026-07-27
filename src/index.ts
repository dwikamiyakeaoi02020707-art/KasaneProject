import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { Hono, Context } from "hono";
import { proxy } from "hono/proxy";
import { db, url } from "./db.js";
import { decrypt, hash } from "./sniffy.js";

const app = new Hono();

// Trigger bundler to include files
const PAGE_ROOT = path.resolve(process.cwd(), "page");

/**
 * Please handle with `try...catch`
 */
function streamFile(filePath: string, mime = "application/octet-stream") {
  console.log(filePath);
  console.log(process.cwd());
  console.log(fs.readdirSync(process.cwd()));
  console.log(fs.readdirSync(path.dirname(filePath)));
  const stream = fs.createReadStream(filePath);
  const streamWeb = Readable.toWeb(stream) as unknown as ReadableStream;
  return new Response(streamWeb, {
    headers: {
      "Content-Length": String(fs.statSync(filePath).size),
      "Content-Type": mime,
    },
  });
}

async function cbtHandler(c: Context) {
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

// app.notFound(() => new Response(null, { status: 404 }));
app.onError((error) => {
  const err = error as NodeJS.ErrnoException;
  if (err.code === "ENOENT") return new Response(null, { status: 404 });
  console.error(error);
  return new Response(null, { status: 500 });
});

app.get("/*", async (c, next) => {
  if (c.req.path.startsWith("/favicon"))
    return proxy("https://avatars.githubusercontent.com/u/249699734");
  if (c.req.path === "/cbt") return cbtHandler(c);
  return streamFile(
    path.join(
      PAGE_ROOT,
      `.${c.req.path.endsWith("/") ? `${c.req.path}index` : c.req.path}.html`,
    ),
    "text/html; charset=utf-8",
  );
});

export default app;
