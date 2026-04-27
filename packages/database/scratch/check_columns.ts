import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function checkColumns() {
    const regions = ["IND", "US", "UAE"];
    for (const region of regions) {
        console.log(`Checking region: ${region}`);
        const url = process.env[`${region}_DATABASE_URL`];
        if (!url) {
            console.log(`No URL for ${region}`);
            continue;
        }
        
        const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
        try {
            const columns = await sql`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'mentorships'
            `;
            console.log(`Columns in ${region}:`, columns.map(c => c.column_name).join(", "));
            
            const hasColumn = columns.some(c => c.column_name === 'isTopMentor');
            console.log(`Region ${region} has isTopMentor: ${hasColumn}`);
        } catch (err) {
            console.error(`Error in ${region}:`, err.message);
        } finally {
            await sql.end();
        }
    }
}

checkColumns();
