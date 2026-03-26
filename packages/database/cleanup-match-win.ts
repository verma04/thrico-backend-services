import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./src/postgres/schema/index";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString =
  process.env.IND_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL or IND_DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(client, { schema });

async function main() {
  console.log("Dropping match_win_prizes table...");
  try {
    await client`DROP TABLE IF EXISTS match_win_prizes CASCADE;`;
    console.log("Dropped match_win_prizes.");
  } catch (err) {
    console.error("Error dropping match_win_prizes:", err);
  }

  // Also check if settings column exists, if not add it
  try {
    const res = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='match_win_config' AND column_name='settings';
    `;
    if (res.length === 0) {
      console.log("Adding settings column to match_win_config...");
      await client`ALTER TABLE match_win_config ADD COLUMN IF NOT EXISTS settings jsonb;`;
      console.log("Added settings column.");
    } else {
      console.log("settings column already exists.");
    }
  } catch (err) {
    console.error("Error updating match_win_config:", err);
  }

  process.exit(0);
}

main();
