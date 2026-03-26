import { log } from "@thrico/logging";
import { StorageService } from "@thrico/services";
import { storageFiles } from "@thrico/database";
import { sql, eq } from "drizzle-orm";

export async function checkStorageHealth(db: any) {
  log.info("Starting Storage Health Check...");
  
  try {
    // Get total storage usage
    const result = await db
      .select({
        totalSize: sql<number>`sum(size_in_bytes)`,
        count: sql<number>`count(*)`,
      })
      .from(storageFiles);

    const stats = result[0];
    const sizeInMB = stats.totalSize ? (stats.totalSize / (1024 * 1024)).toFixed(2) : 0;
    
    log.info("Storage Statistics", {
      totalFiles: stats.count || 0,
      totalSizeMB: sizeInMB,
    });

    // We could add logic here to check if files exist in S3 but not in DB, 
    // or vice versa, but that requires full S3 listing which might be expensive.
    
  } catch (error) {
    log.error("Failed to run storage health check", { error });
  }
}
