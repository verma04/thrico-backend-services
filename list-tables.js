
const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const url = process.env.IND_DATABASE_URL;

if (!url) {
    console.error("IND_DATABASE_URL not found in .env");
    process.exit(1);
}

const sql = postgres(url, { ssl: { rejectUnauthorized: false } });

async function listTables() {
    try {
        const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
        console.log("Tables in public schema:");
        tables.forEach(t => console.log(` - ${t.table_name}`));
        process.exit(0);
    } catch (error) {
        console.error("Error listing tables:", error);
        process.exit(1);
    }
}

listTables();
