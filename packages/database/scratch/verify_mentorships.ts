import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function verify() {
    const url = process.env.US_DATABASE_URL;
    const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
    try {
        const result = await sql`SELECT * FROM mentorships LIMIT 0`; // Limit 0 is enough to get column info
        // node-postgres/postgres.js returns columns in the row metadata if possible, but let's just use a query
        const columns = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'mentorships'
        `;
        console.log("Columns:", columns.map(c => c.column_name).join(", "));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await sql.end();
    }
}

verify();
