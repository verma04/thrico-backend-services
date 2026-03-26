import { getDb, moments, userFeed, storageFiles } from "@thrico/database";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";

export class DBService {
  static async updateMomentStatus(
    momentId: string,
    status: "UPLOADING" | "PROCESSING" | "PUBLISHED" | "FAILED",
    data?: any,
  ) {
    logger.info(`Updating moment ${momentId} status to ${status}`, { data });
    const db = getDb(); // Assuming default region

    await db
      .update(moments)
      .set({
        status,
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(moments.id, momentId));
  }

  static async shareMomentToFeed(data: {
    momentId: string;
    userId: string;
    entityId: string;
    caption: string;
    videoUrl: string;
    thumbnailUrl: string;
  }) {
    logger.info(`Sharing moment ${data.momentId} to feed`);
    const db = getDb();

    await db.insert(userFeed).values({
      userId: data.userId,
      entity: data.entityId,
      description: data.caption,
      source: "moment",
      momentId: data.momentId,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      status: "APPROVED",
    });
  }

  static async trackStorage(data: {
    entityId: string;
    fileKey: string;
    fileUrl: string;
    mimeType: string;
    sizeInBytes: number;
    userId: string;
    module: any;
    referenceId?: string;
    metadata?: any;
  }) {
    logger.info(`Tracking storage for file ${data.fileKey}`, {
      entityId: data.entityId,
      referenceId: data.referenceId,
    });
    const db = getDb();

    await db.insert(storageFiles).values({
      entityId: data.entityId,
      module: data.module,
      fileKey: data.fileKey,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      sizeInBytes: data.sizeInBytes,
      uploadedBy: data.userId,
      referenceId: data.referenceId,
      metadata: data.metadata,
    });
  }
}
