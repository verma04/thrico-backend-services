import fs from "fs";
import path from "path";
import { log } from "@thrico/logging";
import { S3Service } from "../utils/s3.service";
import { ENV } from "@thrico/shared";

export class LogUploaderService {
  /**
   * Scans the log directory and uploads rotated/compressed log files to S3.
   * Day-by-day organization: logs/YYYY-MM-DD/service-name.log.gz
   */
  static async uploadLogsToS3() {
    const logDir = path.resolve(process.cwd(), ENV.LOG_DIR || "logs");
    
    if (!fs.existsSync(logDir)) {
      log.warn("Log directory does not exist, skipping upload", { logDir });
      return;
    }

    log.info("Starting log upload to S3", { logDir });

    try {
      const files = fs.readdirSync(logDir);
      
      // We look for files matching the pattern: combined-YYYY-MM-DD.log.gz, error-YYYY-MM-DD.log.gz, etc.
      // winston-daily-rotate-file with zippedArchive: true produces .gz files
      const rotatedFiles = files.filter(f => f.endsWith(".gz") || f.includes("-20")); // Basic check for rotated files

      if (rotatedFiles.length === 0) {
        log.info("No rotated log files found for upload");
        return;
      }

      for (const fileName of rotatedFiles) {
        const filePath = path.join(logDir, fileName);
        const stats = fs.statSync(filePath);

        // Only upload if it's a file and not currently being written to (approximate check)
        // If it's a .gz file, it's definitely rotated.
        if (stats.isFile()) {
          await this.uploadSingleLogFile(fileName, filePath);
        }
      }

      log.info("Finished log upload process");
    } catch (error) {
      log.error("Failed to list or upload logs", { error });
    }
  }

  private static async uploadSingleLogFile(fileName: string, filePath: string) {
    try {
      // Extract date from filename if possible (e.g., combined-2024-03-23.log.gz)
      const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
      const dateFolder = dateMatch ? dateMatch[1] : "unknown-date";
      
      const fileContent = fs.readFileSync(filePath);
      const s3Key = `system-logs/${dateFolder}/${fileName}`;

      log.info(`Uploading log file to S3: ${fileName} -> ${s3Key}`);

      await S3Service.upload({
        Bucket: S3Service.getBucket(),
        Key: s3Key,
        Body: fileContent,
        ContentType: fileName.endsWith(".gz") ? "application/gzip" : "text/plain",
      });

      log.info(`Successfully uploaded ${fileName}, deleting local copy`);
      
      // Delete local file after successful upload to save space
      fs.unlinkSync(filePath);
    } catch (error) {
      log.error(`Failed to upload log file ${fileName}`, { error });
    }
  }
}
