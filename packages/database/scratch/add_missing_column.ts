import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function applyFix() {
    const regions = ["IND", "US", "UAE"];
    for (const region of regions) {
        console.log(`Applying fix to region: ${region}`);
        const url = process.env[`${region}_DATABASE_URL`];
        if (!url) {
            console.log(`No URL for ${region}`);
            continue;
        }
        
        const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
        try {
            // Check again just to be safe
            const columns = await sql`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'mentorships' AND column_name = 'isTopMentor'
            `;
            
            if (columns.length === 0) {
                console.log(`Adding isTopMentor column to mentorships in ${region}...`);
                await sql`ALTER TABLE "mentorships" ADD COLUMN "isTopMentor" boolean NOT NULL DEFAULT false`;
                console.log(`Successfully added isTopMentor to ${region}`);
            } else {
                console.log(`isTopMentor already exists in ${region}`);
            }
        } catch (err) {
            console.error(`Error in ${region}:`, err.message);
        } finally {
            await sql.end();
        }
    }
}

applyFix();
