import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config({
  path: ".env",
});

export default {
  schema: `${__dirname}/packages/database/src/postgres/schema/`,
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    host: process.env.DB_INDIA_HOST || "localhost",
    port: parseInt(process.env.DB_INDIA_PORT || "5432", 10),
    user: process.env.DB_INDIA_USER || "thrico_user",
    password: process.env.DB_INDIA_PASSWORD || "thrico_password",
    database: process.env.DB_INDIA_NAME || "thrico_india",
  },
} satisfies Config;
