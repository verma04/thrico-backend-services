import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { DatabaseRegion } from "@thrico/shared";
import { log } from "@thrico/logging";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file at the monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const regions = [DatabaseRegion.IND];

async function runMigrations() {
  log.info("Starting database migrations for all regions");

  for (const region of regions) {
    try {
      const regionUpper = region.toUpperCase();

      // Check if DATABASE_URL is provided (preferred method)
      const databaseUrl = process.env[`${regionUpper}_DATABASE_URL`];
      console.log(databaseUrl);

      let sql;
      if (databaseUrl) {
        log.info(`Running migrations for ${region} region using DATABASE_URL`);
        sql = postgres(databaseUrl, {
          max: 1, // Single connection for migrations
          ssl: { rejectUnauthorized: false },
        });
      } else {
        // Fallback to individual parameters
        const config = {
          host: process.env[`DB_${regionUpper}_HOST`] || "localhost",
          port: parseInt(process.env[`DB_${regionUpper}_PORT`] || "5432", 10),
          username: process.env[`DB_${regionUpper}_USER`] || "thrico_user",
          password:
            process.env[`DB_${regionUpper}_PASSWORD`] || "thrico_password",
          database: process.env[`DB_${regionUpper}_NAME`] || `thrico_${region}`,
        };

        log.info(`Running migrations for ${region} region`, config);
        sql = postgres(config);
      }

      const db = drizzle(sql);

      await migrate(db, {
        migrationsFolder: path.resolve(__dirname, "../../drizzle"),
      });

      log.info(`Migrations completed successfully for ${region} region`);

      await sql.end();
    } catch (error) {
      log.error(`Migration failed for ${region} region`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  log.info("All migrations completed successfully");
  process.exit(0);
}

runMigrations().catch((error) => {
  log.error("Migration process failed", error);
  process.exit(1);
});
