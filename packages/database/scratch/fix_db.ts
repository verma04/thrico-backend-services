import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function fixColumns() {
  const databaseUrl = process.env.IND_DATABASE_URL;
  if (!databaseUrl) {
    console.error("IND_DATABASE_URL not found");
    return;
  }

  const sql = postgres(databaseUrl, { ssl: { rejectUnauthorized: false } });
  
  try {
    console.log("Adding missing columns to entitySettings...");
    
    await sql.begin(async (sql) => {
      await sql`ALTER TABLE "entitySettings" ADD COLUMN IF NOT EXISTS "allowCommunityInFeed" boolean DEFAULT true`;
      await sql`ALTER TABLE "entitySettings" ADD COLUMN IF NOT EXISTS "allowDiscussionForumInFeed" boolean DEFAULT true`;
      await sql`ALTER TABLE "entitySettings" ADD COLUMN IF NOT EXISTS "allowPollsInFeed" boolean DEFAULT true`;
      await sql`ALTER TABLE "entitySettings" ADD COLUMN IF NOT EXISTS "allowAdminFeedInFeed" boolean DEFAULT true`;
      await sql`ALTER TABLE "entitySettings" ADD COLUMN IF NOT EXISTS "allowMomentsInFeed" boolean DEFAULT true`;
    });
    
    console.log("Success! Columns added.");
  } catch (error) {
    console.error("Error fixing columns:", error);
  } finally {
    await sql.end();
  }
}

fixColumns();
