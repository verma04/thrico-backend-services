import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function checkTables() {
  const sql = postgres(process.env.IND_DATABASE_URL!, { ssl: { rejectUnauthorized: false } });
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('Tables in database:');
    tables.forEach(t => console.log(`- ${t.table_name}`));
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await sql.end();
  }
}

checkTables();
