import type { Config } from "drizzle-kit";

export default {
  schema: "./src/postgres/schema/**/*.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    host: process.env.DB_IND_HOST || "localhost",
    port: parseInt(process.env.DB_IND_PORT || "5432", 10),
    user: process.env.DB_IND_USER || "thrico_user",
    password: process.env.DB_IND_PASSWORD || "thrico_password",
    database: process.env.DB_IND_NAME || "thrico_india",
  },
} satisfies Config;
