import { getDb, DatabaseRegion } from "./packages/database/src";
import { sql } from "drizzle-orm";

async function checkTable() {
  try {
    const db = getDb(DatabaseRegion.IND);
    const result = await db.execute(sql`SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE  table_schema = 'public'
      AND    table_name   = 'profileViews'
    );`);
    console.log("Table check result:", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error checking table:", error);
    process.exit(1);
  }
}

checkTable();
