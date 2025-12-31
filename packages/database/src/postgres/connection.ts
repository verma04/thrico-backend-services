import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql as sqlTemplate } from "drizzle-orm";
import postgres from "postgres";
import { DatabaseRegion } from "@thrico/shared";
import { log } from "@thrico/logging";
import * as schema from "./schema";

// Database connection configuration
interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Get database configuration for a specific region
function getDbConfig(region: DatabaseRegion): DbConfig | string {
  const regionUpper = region.toUpperCase();

  // Check if DATABASE_URL is provided (preferred method for DigitalOcean, Heroku, etc.)
  const databaseUrl = process.env[`${regionUpper}_DATABASE_URL`];
  if (databaseUrl) {
    return databaseUrl;
  }

  // Fallback to individual parameters
  return {
    host: process.env[`DB_${regionUpper}_HOST`] || "localhost",
    port: parseInt(process.env[`DB_${regionUpper}_PORT`] || "5432", 10),
    user: process.env[`DB_${regionUpper}_USER`] || "thrico_user",
    password: process.env[`DB_${regionUpper}_PASSWORD`] || "thrico_password",
    database: process.env[`DB_${regionUpper}_NAME`] || `thrico_${region}`,
  };
}

// Connection pool for each region
const connectionPools: Map<
  DatabaseRegion,
  ReturnType<typeof postgres>
> = new Map();
const dbInstances: Map<DatabaseRegion, ReturnType<typeof drizzle>> = new Map();

/**
 * Get or create a database connection for a specific region
 */
export function getDb(region: DatabaseRegion = DatabaseRegion.IND) {
  // Return cached instance if exists
  if (dbInstances.has(region)) {
    return dbInstances.get(region)!;
  }

  try {
    const config = getDbConfig(region);

    log.info(`Connecting to PostgreSQL database`, { region });

    // Create postgres connection - supports both URL string and config object
    const sql =
      typeof config === "string"
        ? postgres(config, {
            max: 10,
            idle_timeout: 20,
            connect_timeout: 10,
            ssl: { rejectUnauthorized: false },
          })
        : postgres({
            host: config.host,
            port: config.port,
            username: config.user,
            password: config.password,
            database: config.database,
            max: 10,
            idle_timeout: 20,
            connect_timeout: 10,
          });

    // Create drizzle instance
    const db = drizzle(sql, { schema });

    // Cache the connection
    connectionPools.set(region, sql);
    dbInstances.set(region, db);

    log.info(`Successfully connected to PostgreSQL database`, { region });

    return db;
  } catch (error) {
    log.error(`Failed to connect to PostgreSQL database`, {
      region,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Get database connection based on user's region or default region
 */
export function getDbForUser(userRegion?: DatabaseRegion) {
  const region =
    userRegion ||
    (process.env.DEFAULT_DB_REGION as DatabaseRegion) ||
    DatabaseRegion.IND;
  return getDb(region);
}

/**
 * Close all database connections
 */
export async function closeAllConnections() {
  log.info("Closing all database connections");

  for (const [region, sql] of connectionPools.entries()) {
    try {
      await sql.end();
      log.info(`Closed database connection`, { region });
    } catch (error) {
      log.error(`Error closing database connection`, {
        region,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  connectionPools.clear();
  dbInstances.clear();
}

/**
 * Test database connection for a specific region
 */
export async function testConnection(region: DatabaseRegion): Promise<boolean> {
  try {
    const db = getDb(region);
    await db.execute(sqlTemplate`SELECT 1`);
    log.info(`Database connection test successful`, { region });
    return true;
  } catch (error) {
    log.error(`Database connection test failed`, {
      region,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

// Export schema for use in queries
export { schema };

export type AppDatabase = PostgresJsDatabase<typeof schema>;
