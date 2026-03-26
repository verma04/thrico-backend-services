import { storageFiles, type StorageModule } from "@thrico/database";
import { S3Service } from "../utils/s3.service";
import { log } from "@thrico/logging";
import { eq, sql, desc, and } from "drizzle-orm";
import moment from "moment";
import sharp from "sharp";
import { streamToBuffer } from "../stremToBuffer";

export class StorageService {
  /**
   * Track an uploaded file to S3 and save metadata in the DB.
   * This allows us to track which module and entity owns the data and its size.
   */
  static async trackUploadedFile(
    fileUrlOrKey: string,
    entityId: string,
    moduleType: StorageModule,
    userId: string | null,
    db: any,
    options?: {
      mimeType?: string;
      sizeInBytes?: number;
      referenceId?: string;
      metadata?: any;
    },
  ) {
    try {
      let key = "";
      try {
        const url = new URL(fileUrlOrKey);
        key = url.pathname.startsWith("/")
          ? url.pathname.substring(1)
          : url.pathname;
      } catch (e) {
        // If it's not a valid URL, treat it as the S3 object key directly
        key = fileUrlOrKey;
      }

      let sizeInBytes = options?.sizeInBytes || 0;
      let mimeType = options?.mimeType || null;

      // If options not provided or missing size/mime, fetch file info from S3
      if (!options?.sizeInBytes || !options?.mimeType) {
        try {
          const s3Metadata = await S3Service.getFileMetadata(key);
          sizeInBytes = sizeInBytes || s3Metadata.ContentLength || 0;
          mimeType = mimeType || s3Metadata.ContentType || null;
        } catch (s3Error) {
          log.warn("Could not fetch S3 metadata for file tracking", {
            key,
            error: s3Error,
          });
        }
      }

      const fileUrl = S3Service.getPublicUrl(key);

      // Check if file is already tracked
      const [existing] = await db
        .select()
        .from(storageFiles)
        .where(
          and(
            eq(storageFiles.fileKey, key),
            eq(storageFiles.entityId, entityId),
            eq(storageFiles.module, moduleType),
          ),
        );

      let stored;
      if (existing) {
        log.info(`Updating existing storage record for key: ${key}`);
        [stored] = await db
          .update(storageFiles)
          .set({
            mimeType: mimeType || existing.mimeType,
            sizeInBytes: sizeInBytes || existing.sizeInBytes,
            referenceId: options?.referenceId || existing.referenceId,
            metadata: options?.metadata || existing.metadata,
            updatedAt: new Date(),
          })
          .where(eq(storageFiles.id, existing.id))
          .returning();
      } else {
        [stored] = await db
          .insert(storageFiles)
          .values({
            entityId,
            module: moduleType,
            fileKey: key,
            fileUrl,
            mimeType,
            sizeInBytes,
            uploadedBy: userId,
            referenceId: options?.referenceId,
            metadata: options?.metadata,
          })
          .returning();
      }

      log.info(
        `${existing ? "Updated" : "Tracked"} file storage of ${sizeInBytes} bytes for module ${moduleType}`,
        {
          entityId,
          key,
          referenceId: options?.referenceId,
        },
      );

      return stored;
    } catch (error: any) {
      log.error("Error tracking storage metadata for S3 file", {
        error: error.message,
        stack: error.stack,
        fileUrlOrKey,
        entityId,
        moduleType,
      });
      throw error;
    }
  }

  /**
   * Upload and track images (converts to WebP)
   * Replaces uploadFeedImage from upload.utils
   */
  static async uploadImages(
    images: any[],
    entityId: string,
    moduleType: StorageModule,
    userId: string,
    db: any,
    referenceId?: string,
  ) {
    if (!images || images.length === 0) {
      return [] as { file: string; size: number; mimetype: string }[];
    }

    try {
      const imgData = images.map((set) => {
        const date = moment().format("YYYYMMDD");
        const randomString = Math.random().toString(36).substring(2, 7);
        const folder = moduleType.toLowerCase();
        const newFilename = `${entityId}/${folder}/${userId}/${date}-${randomString}.webp`;
        return { img: set, file: newFilename };
      });

      await Promise.all(
        imgData.map(async (set: any) => {
          const resolved = await (set.img.promise || set.img);
          const { filename, mimetype, createReadStream } = resolved;

          if (typeof createReadStream !== "function") {
            log.error("Invalid upload object structure", { resolved });
            throw new Error("createReadStream is not a function");
          }

          const imageBuffer = await streamToBuffer(createReadStream());
          const sharpImage = await sharp(imageBuffer)
            .toFormat("webp")
            .webp({ quality: 20 })
            .toBuffer();

          const params = {
            Bucket: S3Service.getBucket(),
            Key: set.file,
            Body: sharpImage,
            ContentType: "image/webp",
          };

          await S3Service.upload(params);

          // Update size in metadata for return
          set.size = sharpImage.length;
          set.mimetype = "image/webp";

          // Track the file with the same referenceId and including the size
          await this.trackUploadedFile(
            set.file,
            entityId,
            moduleType,
            userId,
            db,
            {
              referenceId,
              sizeInBytes: sharpImage.length,
              mimeType: "image/webp",
            },
          );

          return { filename };
        }),
      );

      return imgData as unknown as {
        file: string;
        size: number;
        mimetype: string;
      }[];
    } catch (error) {
      log.error("Error uploading and tracking images", {
        error,
        entityId,
        moduleType,
        referenceId,
      });
      throw error;
    }
  }

  /**
   * Upload and track a single file without image processing
   * Replaces upload from upload.ts
   */
  static async uploadFile(
    file: any,
    entityId: string,
    moduleType: StorageModule,
    userId: string | null,
    db: any,
    options?: {
      prefix?: string;
      processImage?: boolean;
      referenceId?: string;
    },
  ) {
    try {
      const resolvedFile = await (file.promise || file);
      const { createReadStream, filename, mimetype } = resolvedFile;

      if (typeof createReadStream !== "function") {
        log.error("Upload object structure:", resolvedFile);
        throw new Error("createReadStream is not a function");
      }

      const date = moment().format("YYYYMMDD");
      const randomString = Math.random().toString(36).substring(2, 7);

      let newFilename = `${date}-${randomString}`;
      let body: Buffer;
      let contentType = mimetype;

      if (options?.processImage) {
        const imageBuffer = await streamToBuffer(createReadStream());
        body = await sharp(imageBuffer)
          .toFormat("webp")
          .webp({ quality: 20 })
          .toBuffer();
        newFilename = `${newFilename}.webp`;
        contentType = "image/webp";
      } else {
        body = await streamToBuffer(createReadStream());
        const ext = filename.split(".").pop();
        newFilename = `${newFilename}.${ext}`;
      }

      const folder = moduleType.toLowerCase();
      const userPart = userId || "anonymous";
      let key = options?.prefix
        ? `${entityId}/${folder}/${userPart}/${options.prefix}/${newFilename}`
        : `${entityId}/${folder}/${userPart}/${newFilename}`;

      const params = {
        Bucket: S3Service.getBucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
      };

      await S3Service.upload(params);

      // Track the file
      await this.trackUploadedFile(key, entityId, moduleType, userId, db, {
        referenceId: options?.referenceId,
        sizeInBytes: body.length,
        mimeType: contentType,
      });

      return { key, size: body.length, mimetype: contentType };
    } catch (error) {
      log.error("Error uploading and tracking file", {
        error,
        entityId,
        moduleType,
        referenceId: options?.referenceId,
      });
      throw error;
    }
  }

  /**
   * Upload and track a video file
   * Replaces uploadVideo from uploadVideo.ts
   */
  static async uploadVideo(
    file: any,
    entityId: string,
    moduleType: StorageModule,
    userId: string,
    db: any,
    referenceId?: string,
  ) {
    try {
      const resolvedFile = await (file.promise || file);
      const { createReadStream, filename, mimetype } = resolvedFile;

      if (typeof createReadStream !== "function") {
        log.error("Video upload object structure:", resolvedFile);
        throw new Error("createReadStream is not a function");
      }

      const date = moment().format("YYYYMMDD");
      const randomString = Math.random().toString(36).substring(2, 7);

      const getFileExtension = (fname: string, mtype: string) => {
        if (fname && fname.includes(".")) {
          return fname.split(".").pop();
        }
        const mimetypeMap: Record<string, string> = {
          "video/mp4": "mp4",
          "video/webm": "webm",
          "video/ogg": "ogv",
          "video/avi": "avi",
          "video/mov": "mov",
          "video/quicktime": "mov",
        };
        return mimetypeMap[mtype] || "mp4";
      };

      const fileExtension = getFileExtension(filename, mimetype);
      const folder = moduleType.toLowerCase();
      const newFilename = `${entityId}/${folder}/${userId}/videos/${date}-${randomString}.${fileExtension}`;

      const videoBuffer = await streamToBuffer(createReadStream());

      if (!videoBuffer || videoBuffer.length === 0) {
        throw new Error("Failed to convert video stream to buffer");
      }

      const params = {
        Bucket: S3Service.getBucket(),
        Key: newFilename,
        Body: videoBuffer,
        ContentType: mimetype,
        Metadata: {
          "original-filename": filename,
          "upload-date": date,
          "file-type": "video",
        },
      };

      const data = await S3Service.upload(params);

      // Track the file
      await this.trackUploadedFile(
        newFilename,
        entityId,
        moduleType,
        userId,
        db,
        { referenceId },
      );

      return {
        filename: newFilename,
        url: data.Location,
        size: videoBuffer.length,
        mimetype: mimetype,
      };
    } catch (error) {
      log.error("Error uploading and tracking video", {
        error,
        entityId,
        moduleType,
      });
      throw error;
    }
  }

  /**
   * Get storage statistics grouped by module so we can control and know which module has more data stored.
   */
  static async getStorageStatsByModule(db: any, entityId?: string) {
    try {
      const condition = entityId
        ? eq(storageFiles.entityId, entityId)
        : sql`1=1`;

      const stats = await db
        .select({
          module: storageFiles.module,
          totalBytes: sql<number>`SUM(size_in_bytes)::bigint`,
          fileCount: sql<number>`COUNT(id)::int`,
        })
        .from(storageFiles)
        .where(condition)
        .groupBy(storageFiles.module)
        .orderBy(desc(sql`SUM(size_in_bytes)::bigint`)); // Orders modules by whichever has the most data stored

      return stats;
    } catch (error) {
      log.error("Error retrieving storage statistics by module", {
        error,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Get total storage summary (total bytes and file count)
   */
  static async getTotalStorageSummary(db: any, entityId?: string) {
    try {
      const condition = entityId
        ? eq(storageFiles.entityId, entityId)
        : sql`1=1`;

      const [summary] = await db
        .select({
          totalBytes: sql<number>`SUM(size_in_bytes)::bigint`,
          totalFileCount: sql<number>`COUNT(id)::int`,
        })
        .from(storageFiles)
        .where(condition);

      return {
        totalBytes: summary?.totalBytes || 0,
        totalFileCount: summary?.totalFileCount || 0,
      };
    } catch (error) {
      log.error("Error retrieving total storage summary", {
        error,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Delete tracked file and remove from S3
   */
  static async deleteTrackedFile(id: string, db: any) {
    try {
      const [storedFile] = await db
        .select()
        .from(storageFiles)
        .where(eq(storageFiles.id, id));

      if (storedFile) {
        // Delete from S3
        if (storedFile.fileKey) {
          await S3Service.deleteObject(storedFile.fileKey).catch((err) => {
            log.error(
              `Failed to delete S3 object ${storedFile.fileKey} during tracked file removal`,
              err,
            );
          });
        }

        await db.delete(storageFiles).where(eq(storageFiles.id, id));
        log.info(
          `Deleted tracked file with id ${id} from database and attempted S3 removal.`,
        );
      }

      return true;
    } catch (error) {
      log.error("Error deleting tracked file", { error, id });
      throw error;
    }
  }

  /**
   * Helper to delete by file URL
   */
  static async unTrackFileByUrl(fileUrl: string, db: any) {
    try {
      const [storedFile] = await db
        .select()
        .from(storageFiles)
        .where(eq(storageFiles.fileUrl, fileUrl));

      if (storedFile) {
        return await this.deleteTrackedFile(storedFile.id, db);
      }
      return false;
    } catch (error) {
      log.error("Error untracking file by URL", { error, fileUrl });
      throw error;
    }
  }
}
