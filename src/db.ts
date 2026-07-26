import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/tursodatabase-serverless";

export const url = sqliteTable("url", {
  id: text().primaryKey(),
  success: integer({ mode: "boolean" }),
  created: text().default(sql`CURRENT_TIMESTAMP`),
  modified: text(),
  url: text(),
  ip: text(),
  ua: text(),
  sec: text(),
});

export const db = drizzle({
  connection: {
    url: process.env.LIBSQL!,
    authToken: process.env.TOKEN,
  },
});
