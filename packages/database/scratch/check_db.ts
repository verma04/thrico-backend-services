import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(__dirname, "../../../.env");
console.log("Loading env from:", envPath);
dotenv.config({ path: envPath });

async function renameEntitySettingsColumns() {
  const regions = ["IND_DATABASE_URL", "USA_DATABASE_URL", "UAE_DATABASE_URL"];
  
  const renames = [
    ["allowCommunityInFeed", "allowEntityCommunityInFeed"],
    ["allowAdminFeedInFeed", "allowEntityFeedInFeed"],
    ["allowMomentsInFeed", "allowEntityMomentsInFeed"],
    ["allowDiscussionForumInFeed", "allowEntityDiscussionForumInFeed"],
    ["allowPollsInFeed", "allowEntityPollsInFeed"],
  ];

  for (const region of regions) {
    const databaseUrl = process.env[region];
    if (!databaseUrl) continue;

    console.log(`\nConnecting to ${region}...`);
    const sql = postgres(databaseUrl, { ssl: { rejectUnauthorized: false } });
    
    try {
      for (const [oldName, newName] of renames) {
        try {
          console.log(`Renaming ${oldName} to ${newName} in ${region}...`);
          await sql`ALTER TABLE "entitySettings" RENAME COLUMN ${sql(oldName)} TO ${sql(newName)}`;
          console.log(`Successfully renamed ${oldName} to ${newName}`);
        } catch (renameError: any) {
          if (renameError.code === '42703') { // undefined_column
            console.log(`Column ${oldName} does not exist, skipping...`);
          } else if (renameError.code === '42701') { // duplicate_column
            console.log(`Column ${newName} already exists, skipping...`);
          } else {
            console.error(`Error renaming ${oldName}:`, renameError.message);
          }
        }
      }
    } finally {
      await sql.end();
    }
  }
}

renameEntitySettingsColumns();
