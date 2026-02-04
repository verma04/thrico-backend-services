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

// Export schema for use in queries
export { schema };

export type AppDatabase = PostgresJsDatabase<typeof schema>;

// Connection pool for each region
const connectionPools: Map<
  DatabaseRegion,
  ReturnType<typeof postgres>
> = new Map();
const dbInstances: Map<DatabaseRegion, AppDatabase> = new Map();

// Map to track pools by their configuration string to allow sharing across regions
const poolsByConfig: Map<string, ReturnType<typeof postgres>> = new Map();

/**
 * Get or create a database connection for a specific region
 */
export function getDb(
  region: DatabaseRegion = DatabaseRegion.IND,
): AppDatabase {
  // Return cached instance if exists
  if (dbInstances.has(region)) {
    return dbInstances.get(region)!;
  }

  try {
    const config = getDbConfig(region);
    const configKey =
      typeof config === "string" ? config : JSON.stringify(config);

    log.info(`Connecting to PostgreSQL database`, { region });

    // Check if we already have a pool for this configuration
    let sql = poolsByConfig.get(configKey);

    if (!sql) {
      log.info(`Creating new connection pool for config`, { region });
      // Create postgres connection - supports both URL string and config object
      // Reduced max connections for development to prevent exhaustion across services
      sql =
        typeof config === "string"
          ? postgres(config, {
              max: 3,
              idle_timeout: 10,
              connect_timeout: 10,
              ssl: { rejectUnauthorized: false },
            })
          : postgres({
              host: config.host,
              port: config.port,
              username: config.user,
              password: config.password,
              database: config.database,
              max: 3,
              idle_timeout: 10,
              connect_timeout: 10,
            });

      poolsByConfig.set(configKey, sql);
    } else {
      log.info(`Reusing existing connection pool for region`, { region });
    }

    // Create drizzle instance
    const db: AppDatabase = drizzle(sql, { schema });

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
