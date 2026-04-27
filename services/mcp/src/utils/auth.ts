import { getDb, mcpKeys } from "@thrico/database";
import { eq } from "drizzle-orm";
import { DatabaseRegion } from "@thrico/shared";
import { log } from "@thrico/logging";

// Helper to search for an MCP key across all available database regions
export async function findMCPKeyAcrossRegions(apiKey: string) {
  const regions = [DatabaseRegion.IND, DatabaseRegion.US, DatabaseRegion.UAE];
  for (const region of regions) {
    try {
      const regionalDb = getDb(region);
      const keyRecord = await regionalDb.query.mcpKeys.findFirst({
        where: eq(mcpKeys.apiKey, apiKey),
      });
      if (keyRecord) {
        return { keyRecord, db: regionalDb, region };
      }
    } catch (error: any) {
      log.warn(`Failed to check region ${region} for MCP key`, {
        error: error.message,
      });
    }
  }
  return null;
}
