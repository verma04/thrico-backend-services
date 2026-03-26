import { getDb, DatabaseRegion, profileViews } from "./packages/database/src";
import { log } from "@thrico/logging";

async function testQuery() {
  try {
    const db = getDb(DatabaseRegion.IND);
    const result = await db.select().from(profileViews).limit(1);
    console.log("Query success:", result);
    process.exit(0);
  } catch (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
}

testQuery();
