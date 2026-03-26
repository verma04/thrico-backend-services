import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";
import { DatabaseRegion } from "@thrico/shared";
import { log } from "@thrico/logging";

// Load environment variables from .env file at the monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

async function setupVector() {
  const regions = [DatabaseRegion.IND, DatabaseRegion.US, DatabaseRegion.UAE];

  for (const region of regions) {
    try {
      const regionUpper = region.toUpperCase();
      // Fix for US vs USA convention if necessary
      const envPrefix = regionUpper === "US" ? "USA" : regionUpper;
      const databaseUrl =
        process.env[`${envPrefix}_DATABASE_URL`] ||
        process.env[`${regionUpper}_DATABASE_URL`];

      log.info(`Setting up vector extension and columns for ${region} region`);

      let sql;
      if (databaseUrl) {
        sql = postgres(databaseUrl, { ssl: { rejectUnauthorized: false } });
      } else {
        const config = {
          host: process.env[`DB_${regionUpper}_HOST`] || "localhost",
          port: parseInt(process.env[`DB_${regionUpper}_PORT`] || "5432", 10),
          username: process.env[`DB_${regionUpper}_USER`] || "thrico_user",
          password:
            process.env[`DB_${regionUpper}_PASSWORD`] || "thrico_password",
          database: process.env[`DB_${regionUpper}_NAME`] || `thrico_${region}`,
        };
        sql = postgres(config);
      }

      // 1. Create Extension
      log.info(`- Creating vector extension...`);
      await sql`CREATE EXTENSION IF NOT EXISTS vector;`;

      // 2. Add embedding column to thrico_moments if missing
      log.info(`- Adding embedding column to thrico_moments...`);
      await sql`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='thrico_moments' AND column_name='embedding') THEN
            ALTER TABLE "thrico_moments" ADD COLUMN "embedding" vector(1536);
          END IF;
        END $$;
      `;

      // 3. Add AI metadata columns to thrico_moments if missing
      log.info(`- Adding AI metadata columns to thrico_moments...`);
      await sql`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='thrico_moments' AND column_name='detected_category') THEN
            ALTER TABLE "thrico_moments" ADD COLUMN "detected_category" text;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='thrico_moments' AND column_name='extracted_keywords') THEN
            ALTER TABLE "thrico_moments" ADD COLUMN "extracted_keywords" text[];
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='thrico_moments' AND column_name='sentiment_score') THEN
            ALTER TABLE "thrico_moments" ADD COLUMN "sentiment_score" real;
          END IF;
        END $$;
      `;

      // 4. Add embedding column to thricoUser if missing
      log.info(`- Adding embedding column to thricoUser...`);
      await sql`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='thricoUser' AND column_name='embedding') THEN
            ALTER TABLE "thricoUser" ADD COLUMN "embedding" vector(1536);
          END IF;
        END $$;
      `;

      // 5. Create index if missing
      log.info(`- Creating vector index...`);
      await sql`CREATE INDEX IF NOT EXISTS "moments_embedding_idx" ON "thrico_moments" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);`;

      log.info(
        `Successfully set up vector extension and columns for ${region}`,
      );
      await sql.end();
    } catch (error) {
      log.error(`Failed to setup vector for ${region} region`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

setupVector()
  .then(() => {
    log.info("Vector setup script completed");
    process.exit(0);
  })
  .catch((err) => {
    log.error("Vector setup script failed", err);
    process.exit(1);
  });
