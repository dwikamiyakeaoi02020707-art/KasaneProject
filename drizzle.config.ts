import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./src/db.ts",
  dbCredentials: {
    url: process.env.LIBSQL!,
    authToken: process.env.TOKEN,
  },
});
