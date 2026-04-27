import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function verifyAll() {
    const regions = ["IND", "US", "UAE"];
    for (const region of regions) {
        const url = process.env[`${region}_DATABASE_URL`];
        if (!url) continue;
        const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
        try {
            const columns = await sql`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'mentorships'
            `;
            console.log(`${region}:`, columns.some(c => c.column_name === 'isTopMentor'));
        } catch (err) {
            console.error(region, err.message);
        } finally {
            await sql.end();
        }
    }
}

verifyAll();
