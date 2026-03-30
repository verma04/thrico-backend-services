import { v4 as uuidv4 } from "uuid";
import { S3Service } from "../utils/s3.service";
import { RabbitMQService } from "../utils/rabbitmq.service";
import {
  moments,
  user,
  aboutUser,
  momentReactions,
  momentComments,
  momentWishlist,
  momentViews,
  userFeed,
  connections,
  userToEntity,
} from "@thrico/database";
import { and, desc, eq, lt, sql, exists, or } from "drizzle-orm";
import { log } from "@thrico/logging";
import { GamificationEventService } from "../gamification/gamification-event.service";
import { AIService } from "../utils/ai.service";
import { MomentNotificationService } from "./moment-notification.service";
import { StorageService } from "../storage/storage.service";

export class MomentService {
  public static encodeCursor(moment: {
    createdAt: Date | null;
    id: string;
  }): string {
    const date = moment.createdAt ? moment.createdAt : new Date();
    return Buffer.from(`${date.toISOString()}|${moment.id}`).toString("base64");
  }

  public static decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf8");
      if (decoded.includes("|")) {
        const [createdAtStr, id] = decoded.split("|");
        const date = new Date(createdAtStr);
        if (!isNaN(date.getTime())) {
          return { createdAt: date, id };
        }
      }
    } catch (e) {}

    // Fallback for old simple date cursors or non-base64 strings
    const date = new Date(cursor);
    return { createdAt: !isNaN(date.getTime()) ? date : new Date(), id: "" };
  }

  static async generateUploadUrl(
    input: {
      videoFileName: string;
      videoFileType: string;
      thumbnailFileName: string;
      thumbnailFileType: string;
    },
    entityId: string,
    userId: string,
    db: any,
  ) {
    try {
      const momentId: string = uuidv4();
      const videoKey = `${entityId}/moments/${momentId}/original.mp4`;
      const thumbnailKey = `${entityId}/moments/${momentId}/thumbnail.jpg`;

      log.info(`Generating upload URLs for moment: ${momentId}`, {
        entityId,
        videoKey,
        thumbnailKey,
      });

      const [videoUploadUrl, thumbnailUploadUrl] = await Promise.all([
        S3Service.getPreSignedPutUrl(videoKey, input.videoFileType),
        S3Service.getPreSignedPutUrl(thumbnailKey, input.thumbnailFileType),
      ]);

      const videoFileUrl = `/${videoKey}`;
      const thumbnailFileUrl = `/${thumbnailKey}`;

      // Save in storage schema before returning URLs
      await Promise.all([
        StorageService.trackUploadedFile(
          videoKey,
          entityId,
          "MOMENT",
          userId,
          db,
          {
            mimeType: input.videoFileType,
            referenceId: momentId,
            metadata: { type: "video" },
          },
        ),
        StorageService.trackUploadedFile(
          thumbnailKey,
          entityId,
          "MOMENT",
          userId,
          db,
          {
            mimeType: input.thumbnailFileType,
            referenceId: momentId,
            metadata: { type: "thumbnail" },
          },
        ),
      ]);

      return {
        momentId,
        videoUploadUrl,
        videoFileUrl,
        thumbnailUploadUrl,
        thumbnailFileUrl,
        expiresIn: parseInt(
          process.env.UPLOAD_URL_EXPIRY_SECONDS || "3600",
          10,
        ),
      };
    } catch (error) {
      log.error("Error in generateUploadUrl", { error, input, entityId });
      throw error;
    }
  }

  static async confirmUpload(
    fileUrl: string,
    caption: string,
    entityId: string,
    userId: string,
    db: any,
    thumbnailUrl?: string,
    shareInFeed: boolean = false,
    isAiContent: boolean = false,
  ) {
    try {
      let key = "";
      try {
        const url = new URL(fileUrl);
        key = url.pathname.startsWith("/")
          ? url.pathname.substring(1)
          : url.pathname;
      } catch (e) {
        // Fallback for paths without domain
        key = fileUrl.startsWith("/") ? fileUrl.substring(1) : fileUrl;
      }

      const existsFile = await S3Service.checkFileExists(key);
      if (!existsFile) {
        throw new Error("File not found in S3. Please upload the file first.");
      }

      await S3Service.makePublic(key);
      if (thumbnailUrl) {
        try {
          let thumbKey = "";
          try {
            const thumbUrl = new URL(thumbnailUrl);
            thumbKey = thumbUrl.pathname.startsWith("/")
              ? thumbUrl.pathname.substring(1)
              : thumbUrl.pathname;
          } catch (e) {
            thumbKey = thumbnailUrl.startsWith("/")
              ? thumbnailUrl.substring(1)
              : thumbnailUrl;
          }
          await S3Service.makePublic(thumbKey);
        } catch (e) {
          log.warn("Failed to make thumbnail public", { thumbnailUrl });
        }
      }

      let videoPath = fileUrl;
      try {
        const url = new URL(fileUrl);
        videoPath = url.pathname;
      } catch (e) {
        log.warn("Failed to parse video URL fallback to original", { fileUrl });
      }

      let thumbnailPath = thumbnailUrl || null;
      if (thumbnailUrl) {
        try {
          const thumbUrl = new URL(thumbnailUrl);
          thumbnailPath = thumbUrl.pathname;
        } catch (e) {
          log.warn("Failed to parse thumbnail URL fallback to original", {
            thumbnailUrl,
          });
        }
      }

      console.log({
        tenantId: entityId,
        entityId,
        userId,
        videoUrl: videoPath,
        thumbnailUrl: thumbnailPath,
        caption,
        status: "PROCESSING",
      });

      const [moment] = await db
        .insert(moments)
        .values({
          tenantId: entityId,
          entityId,
          userId,
          videoUrl: videoPath,
          thumbnailUrl: thumbnailPath,
          caption,
          status: "PROCESSING",
          isAiContent,
        })
        .returning();

      log.info(`Moment record created: ${moment.id}`, { moment });

      await RabbitMQService.publishToQueue("PROCESS_MOMENT", {
        momentId: moment.id,
        videoUrl: moment.videoUrl,
        tenantId: moment.tenantId,
        entityId: moment.entityId,
        userId: moment.userId,
        caption: moment.caption,
        shareInFeed,
        isAiContent: moment.isAiContent,
      });

      // Track storage usage - link to the created moment via referenceId
      try {
        await StorageService.trackUploadedFile(
          fileUrl,
          entityId,
          "MOMENT",
          userId,
          db,
          {
            referenceId: moment.id,
          },
        );
        if (thumbnailUrl) {
          await StorageService.trackUploadedFile(
            thumbnailUrl,
            entityId,
            "MOMENT",
            userId,
            db,
            {
              referenceId: moment.id,
            },
          );
        }
      } catch (storageError) {
        log.error("Failed to track moment storage usage", {
          storageError,
          momentId: moment.id,
        });
        // Don't throw here, tracking failure shouldn't break the upload flow
      }

      // Gamification trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-moment-create",
        moduleId: "moments",
        userId,
        entityId,
      });

      return moment;
    } catch (error) {
      log.error("Error in confirmUpload", {
        error,
        fileUrl,
        entityId,
        userId,
      });
      throw error;
    }
  }

  static async toggleReaction(momentId: string, userId: string, db: any) {
    try {
      return await db.transaction(async (tx: any) => {
        const [existing] = await tx
          .select()
          .from(momentReactions)
          .where(
            and(
              eq(momentReactions.momentId, momentId),
              eq(momentReactions.userId, userId),
            ),
          );

        if (existing) {
          await tx
            .delete(momentReactions)
            .where(eq(momentReactions.id, existing.id));

          await tx
            .update(moments)
            .set({ totalReactions: sql`${moments.totalReactions} - 1` })
            .where(eq(moments.id, momentId));
        } else {
          await tx.insert(momentReactions).values({
            momentId,
            userId,
            reactionsType: "like",
          });

          await tx
            .update(moments)
            .set({ totalReactions: sql`${moments.totalReactions} + 1` })
            .where(eq(moments.id, momentId));

          // Gamification trigger
          const [momentData] = await tx
            .select({ entityId: moments.entityId })
            .from(moments)
            .where(eq(moments.id, momentId));

          await GamificationEventService.triggerEvent({
            triggerId: "tr-moment-like",
            moduleId: "moments",
            userId,
            entityId: momentData?.entityId,
          });

          // Trigger Notification
          if (!existing) {
            const [owner] = await tx
              .select({ userId: moments.userId })
              .from(moments)
              .where(eq(moments.id, momentId));

            if (owner && owner.userId !== userId) {
              const [userRecord] = await tx
                .select({ firstName: user.firstName, lastName: user.lastName })
                .from(user)
                .where(eq(user.id, userId));

              const userName = userRecord
                ? `${userRecord.firstName} ${userRecord.lastName}`.trim()
                : "A user";

              await MomentNotificationService.notifyMomentLike({
                db: tx,
                userId: owner.userId,
                senderId: userId,
                entityId: momentData?.entityId,
                momentId,
                likerName: userName,
              });
            }
          }
        }

        const [moment] = await tx
          .select()
          .from(moments)
          .where(eq(moments.id, momentId));

        return {
          ...moment,
          isLiked: !existing,
        };
      });
    } catch (error) {
      log.error("Error in toggleReaction", { error, momentId, userId });
      throw error;
    }
  }

  static async addComment(
    momentId: string,
    content: string,
    userId: string,
    db: any,
  ) {
    try {
      return await db.transaction(async (tx: any) => {
        const [comment] = await tx
          .insert(momentComments)
          .values({
            momentId,
            userId,
            content,
          })
          .returning();

        await tx
          .update(moments)
          .set({ totalComments: sql`${moments.totalComments} + 1` })
          .where(eq(moments.id, momentId));

        // Gamification trigger
        const [moment] = await tx
          .select({ entityId: moments.entityId })
          .from(moments)
          .where(eq(moments.id, momentId));

        await GamificationEventService.triggerEvent({
          triggerId: "tr-moment-comment",
          moduleId: "moments",
          userId,
          entityId: moment?.entityId,
          cooldownSeconds: 120,
        });

        const [userData] = await tx
          .select({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          })
          .from(user)
          .where(eq(user.id, userId));

        // Trigger Notification
        const [owner] = await tx
          .select({ userId: moments.userId })
          .from(moments)
          .where(eq(moments.id, momentId));

        if (owner && owner.userId !== userId) {
          const userName = `${userData.firstName} ${userData.lastName}`.trim();
          await MomentNotificationService.notifyMomentComment({
            db: tx,
            userId: owner.userId,
            senderId: userId,
            entityId: moment?.entityId,
            momentId,
            commenterName: userName,
          });
        }

        return {
          ...comment,
          user: userData,
          isOwner: true,
          isPostOwner: false,
        };
      });
    } catch (error) {
      log.error("Error in addComment", { error, momentId, userId });
      throw error;
    }
  }

  static async toggleWishlist(
    momentId: string,
    userId: string,
    entityId: string,
    db: any,
  ) {
    try {
      return await db.transaction(async (tx: any) => {
        const [existing] = await tx
          .select()
          .from(momentWishlist)
          .where(
            and(
              eq(momentWishlist.momentId, momentId),
              eq(momentWishlist.userId, userId),
            ),
          );

        if (existing) {
          await tx
            .delete(momentWishlist)
            .where(eq(momentWishlist.id, existing.id));
        } else {
          await tx.insert(momentWishlist).values({
            momentId,
            userId,
            entityId,
          });
        }

        const [moment] = await tx
          .select()
          .from(moments)
          .where(eq(moments.id, momentId));

        return {
          ...moment,
          isWishlisted: !existing,
        };
      });
    } catch (error) {
      log.error("Error in toggleWishlist", { error, momentId, userId });
      throw error;
    }
  }

  static async deleteMoment(momentId: string, userId: string, db: any) {
    try {
      const [moment] = await db
        .select()
        .from(moments)
        .where(eq(moments.id, momentId));

      if (!moment) throw new Error("Moment not found");
      if (moment.userId !== userId) throw new Error("Unauthorized");

      await db.delete(moments).where(eq(moments.id, momentId));
      return true;
    } catch (error) {
      log.error("Error in deleteMoment", { error, momentId, userId });
      throw error;
    }
  }

  static async incrementView(momentId: string, db: any) {
    try {
      await db
        .update(moments)
        .set({ totalViews: sql`${moments.totalViews} + 1` })
        .where(eq(moments.id, momentId));
      return true;
    } catch (error) {
      log.error("Error in incrementView", { error, momentId });
      throw error;
    }
  }

  static async trackWatchTime(
    input: {
      momentId: string;
      totalDuration: number;
      watchDurationSeconds: number;
    },
    userId: string,
    db: any,
  ) {
    try {
      const { momentId, totalDuration, watchDurationSeconds } = input;

      // Check if it's user's own moment
      const [moment] = await db
        .select({ userId: moments.userId })
        .from(moments)
        .where(eq(moments.id, momentId));

      if (moment && moment.userId === userId) {
        log.info(`Skipping watch time tracking for owner: ${userId}`, {
          momentId,
        });
        return true;
      }

      const completionPercentage =
        totalDuration > 0
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round((watchDurationSeconds / totalDuration) * 100),
              ),
            )
          : 0;
      const completed = completionPercentage >= 80;

      await db.insert(momentViews).values({
        userId,
        momentId,
        totalDuration: Math.round(totalDuration),
        watchDurationSeconds: Math.round(watchDurationSeconds),
        completionPercentage,
        completed,
      });

      // Increment total views on the moment
      await this.incrementView(momentId, db);

      // Log skip if it's a skip (for analytics/debugging)
      if (watchDurationSeconds < 3) {
        log.info(`Moment skipped by user: ${userId}`, {
          momentId,
          watchDurationSeconds,
        });
      }

      return true;
    } catch (error) {
      log.error("Error in trackWatchTime", { error, input, userId });
      throw error;
    }
  }

  static async deleteComment(commentId: string, userId: string, db: any) {
    try {
      return await db.transaction(async (tx: any) => {
        const [comment] = await tx
          .select()
          .from(momentComments)
          .where(eq(momentComments.id, commentId));

        if (!comment) throw new Error("Comment not found");

        const [moment] = await tx
          .select()
          .from(moments)
          .where(eq(moments.id, comment.momentId));

        const isCommentOwner = comment.userId === userId;
        const isPostOwner = moment && moment.userId === userId;

        if (!isCommentOwner && !isPostOwner) {
          throw new Error("Unauthorized to delete this comment");
        }

        await tx.delete(momentComments).where(eq(momentComments.id, commentId));

        if (moment) {
          await tx
            .update(moments)
            .set({ totalComments: sql`${moments.totalComments} - 1` })
            .where(eq(moments.id, moment.id));
        }

        return true;
      });
    } catch (error) {
      log.error("Error in deleteComment", { error, commentId, userId });
      throw error;
    }
  }

  static async getMomentComments(
    momentId: string,
    input: { cursor?: string; limit?: number },
    db: any,
    userId: string,
  ) {
    const { limit: limitInput } = input;
    try {
      const { cursor } = input;
      const limit = parseInt(limitInput?.toString() || "10", 10);

      const baseConditions = [eq(momentComments.momentId, momentId)];
      const whereClause = [...baseConditions];
      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        if (cursorId) {
          whereClause.push(
            sql`(thrico_moment_comments.created_at::timestamp(3), thrico_moment_comments.id) < (${cursorDate.toISOString()}::timestamp(3), ${cursorId}::uuid)`,
          );
        } else {
          whereClause.push(
            sql`thrico_moment_comments.created_at::timestamp(3) < ${cursorDate.toISOString()}::timestamp(3)`,
          );
        }
      }

      const [momentInfo] = await db
        .select({ userId: moments.userId })
        .from(moments)
        .where(eq(moments.id, momentId));

      const results = await db
        .select({
          comment: momentComments,
          owner: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
        })
        .from(momentComments)
        .leftJoin(user, eq(momentComments.userId, user.id))
        .where(and(...whereClause))
        .orderBy(desc(momentComments.createdAt), desc(momentComments.id))
        .limit(limit + 1);

      const hasNextPage = results.length > limit;
      const data = results.slice(0, limit);

      const edges = data.map((r: any) => ({
        cursor: this.encodeCursor({
          createdAt: r.comment.createdAt,
          id: r.comment.id,
        }),
        node: {
          ...r.comment,
          user: r.owner.id ? r.owner : null,
          isOwner: r.comment.userId === userId,
          isPostOwner: momentInfo
            ? r.comment.userId === momentInfo.userId
            : false,
        },
      }));

      const endCursor =
        edges.length > 0 ? edges[edges.length - 1].cursor : null;

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(momentComments)
        .where(and(...baseConditions));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        totalCount: parseInt(totalCountResult.count, 10),
      };
    } catch (error) {
      log.error("Error in getMomentComments", { error, momentId });
      throw error;
    }
  }

  static async getAllMoments(
    input: { cursor?: string; limit?: number },
    entityId: string,
    userId: string,
    db: any,
  ) {
    return this.getMoments(input, entityId, userId, db);
  }

  static async getMyConnectionMoments(
    input: { cursor?: string; limit?: number },
    entityId: string,
    userId: string,
    db: any,
  ) {
    try {
      const { limit: limitInput = 10, cursor } = input;
      const limit = parseInt(limitInput.toString(), 10);

      // 1. Get current user's entity record to get their userToEntity ID
      const currentUserEntity = await db.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity.userId, userId),
          eq(userToEntity.entityId, entityId),
        ),
      });

      if (!currentUserEntity) {
        return {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: 0,
        };
      }

      const userEntityId = currentUserEntity.id;

      // 2. Get global user IDs of connections
      const connectionsList = await db
        .select({
          connectedGlobalId: userToEntity.userId,
        })
        .from(connections)
        .innerJoin(
          userToEntity,
          sql`CASE 
            WHEN ${connections.user1} = ${userEntityId} THEN ${userToEntity.id} = ${connections.user2}
            ELSE ${userToEntity.id} = ${connections.user1}
          END`,
        )
        .where(
          and(
            eq(connections.entity, entityId),
            eq(connections.connectionStatusEnum, "ACCEPTED"),
            or(
              eq(connections.user1, userEntityId),
              eq(connections.user2, userEntityId),
            ),
          ),
        );

      const connectionGlobalIds = connectionsList.map(
        (c: any) => c.connectedGlobalId,
      );

      if (connectionGlobalIds.length === 0) {
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
          totalCount: 0,
        };
      }

      // 3. Fetch moments from these global user IDs
      const whereClause = [
        eq(moments.entityId, entityId),
        sql`thrico_moments.user_id IN (${sql.join(
          connectionGlobalIds.map((id: string) => sql`${id}`),
          sql`, `,
        )})`,
        eq(moments.status, "PUBLISHED"),
      ];

      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        if (cursorId) {
          whereClause.push(
            sql`(thrico_moments.created_at::timestamp(3), thrico_moments.id) < (${cursorDate.toISOString()}::timestamp(3), ${cursorId}::uuid)`,
          );
        } else {
          whereClause.push(
            sql`thrico_moments.created_at::timestamp(3) < ${cursorDate.toISOString()}::timestamp(3)`,
          );
        }
      }

      const results = await db
        .select({
          moment: moments,
          owner: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            headline: aboutUser.headline,
          },
          isLiked: exists(
            db
              .select()
              .from(momentReactions)
              .where(
                and(
                  eq(momentReactions.momentId, moments.id),
                  eq(momentReactions.userId, userId),
                ),
              ),
          ),
          isWishlisted: exists(
            db
              .select()
              .from(momentWishlist)
              .where(
                and(
                  eq(momentWishlist.momentId, moments.id),
                  eq(momentWishlist.userId, userId),
                ),
              ),
          ),
        })
        .from(moments)
        .leftJoin(user, eq(moments.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(and(...whereClause))
        .orderBy(desc(moments.createdAt), desc(moments.id))
        .limit(limit + 1);

      const hasNextPage = results.length > limit;
      const data = results.slice(0, limit);

      const edges = data.map((r: any) => ({
        cursor: this.encodeCursor({
          createdAt: r.moment.createdAt,
          id: r.moment.id,
        }),
        node: {
          ...r.moment,
          owner: r.owner.id ? r.owner : null,
          isLiked: r.isLiked,
          isWishlisted: r.isWishlisted,
          isOwner: r.moment.userId === userId,
        },
      }));

      const endCursor =
        edges.length > 0 ? edges[edges.length - 1].cursor : null;

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(moments)
        .where(and(...whereClause));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        totalCount: parseInt(totalCountResult.count, 10),
      };
    } catch (error) {
      log.error("Error in getMyConnectionMoments", { error, userId, entityId });
      throw error;
    }
  }

  static async getMyMoments(
    input: { cursor?: string; limit?: number },
    entityId: string,
    userId: string,
    db: any,
  ) {
    return this.getMoments(input, entityId, userId, db, userId);
  }

  static async getMoments(
    input: { cursor?: string; limit?: number },
    entityId: string,
    userId: string,
    db: any,
    targetUserId?: string,
  ) {
    const { limit: limitInput } = input;
    try {
      const { cursor } = input;
      const limit = parseInt(limitInput?.toString() || "10", 10);

      const baseConditions = [eq(moments.entityId, entityId)];
      if (targetUserId) {
        baseConditions.push(eq(moments.userId, targetUserId));
      }

      const whereClause = [...baseConditions];
      if (cursor) {
        const { createdAt: cursorDate, id: cursorId } =
          this.decodeCursor(cursor);
        if (cursorId) {
          // Use timestamp(3) to match millisecond precision of ISO string cursors
          whereClause.push(
            sql`(thrico_moments.created_at::timestamp(3), thrico_moments.id) < (${cursorDate.toISOString()}::timestamp(3), ${cursorId}::uuid)`,
          );
        } else {
          // Fallback for old ISO cursors
          whereClause.push(
            sql`thrico_moments.created_at::timestamp(3) < ${cursorDate.toISOString()}::timestamp(3)`,
          );
        }
      }

      const results = await db
        .select({
          moment: moments,
          owner: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            headline: aboutUser.headline,
          },
          isLiked: exists(
            db
              .select()
              .from(momentReactions)
              .where(
                and(
                  eq(momentReactions.momentId, moments.id),
                  eq(momentReactions.userId, userId),
                ),
              ),
          ),
          isWishlisted: exists(
            db
              .select()
              .from(momentWishlist)
              .where(
                and(
                  eq(momentWishlist.momentId, moments.id),
                  eq(momentWishlist.userId, userId),
                ),
              ),
          ),
        })
        .from(moments)
        .leftJoin(user, eq(moments.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(and(...whereClause))
        .orderBy(desc(moments.createdAt), desc(moments.id))
        .limit(limit + 1);

      const hasNextPage = results.length > limit;
      const data = results.slice(0, limit);

      const edges = data.map((r: any) => ({
        cursor: this.encodeCursor({
          createdAt: r.moment.createdAt,
          id: r.moment.id,
        }),
        node: {
          ...r.moment,
          owner: r.owner.id ? r.owner : null,
          isLiked: r.isLiked,
          isWishlisted: r.isWishlisted,
          isOwner: r.moment.userId === userId,
        },
      }));

      const endCursor =
        edges.length > 0 ? edges[edges.length - 1].cursor : null;

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(moments)
        .where(and(...baseConditions));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        totalCount: parseInt(totalCountResult.count, 10),
      };
    } catch (error) {
      log.error("Error in getMoments", { error, entityId, targetUserId });
      throw error;
    }
  }

  static async search(
    query: string,
    input: { cursor?: string; limit?: number },
    entityId: string,
    userId: string,
    db: any,
  ) {
    try {
      const { cursor, limit = 10 } = input;
      const queryEmbedding = await AIService.generateEmbedding(query);
      const embeddingSql = `[${queryEmbedding.join(",")}]`;

      const results = await db
        .select({
          moment: moments,
          owner: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            headline: aboutUser.headline,
          },
          similarity: sql<number>`1 - (thrico_moments.embedding <=> ${embeddingSql})`,
          isLiked: exists(
            db
              .select()
              .from(momentReactions)
              .where(
                and(
                  eq(momentReactions.momentId, moments.id),
                  eq(momentReactions.userId, userId),
                ),
              ),
          ),
          isWishlisted: exists(
            db
              .select()
              .from(momentWishlist)
              .where(
                and(
                  eq(momentWishlist.momentId, moments.id),
                  eq(momentWishlist.userId, userId),
                ),
              ),
          ),
        })
        .from(moments)
        .leftJoin(user, eq(moments.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(
          and(
            eq(moments.entityId, entityId),
            eq(moments.status, "PUBLISHED"),
            cursor
              ? sql`${moments.createdAt} < ${this.decodeCursor(cursor).createdAt}`
              : undefined,
          ),
        )
        .orderBy(sql`thrico_moments.embedding <=> ${embeddingSql}`)
        .limit(limit + 1);

      return this.formatMomentConnection(results, limit, userId);
    } catch (error) {
      log.error("Error in search moments", { error, query });
      throw error;
    }
  }

  static async getSimilar(
    momentId: string,
    input: { cursor?: string; limit?: number },
    entityId: string,
    userId: string,
    db: any,
  ) {
    try {
      const { cursor, limit = 10 } = input;

      // Get target moment embedding
      const [targetMoment] = await db
        .select({ embedding: moments.embedding })
        .from(moments)
        .where(eq(moments.id, momentId));

      if (!targetMoment || !targetMoment.embedding) {
        return {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: 0,
        };
      }

      const embeddingSql = `[${targetMoment.embedding.join(",")}]`;

      const results = await db
        .select({
          moment: moments,
          owner: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            headline: aboutUser.headline,
          },
          similarity: sql<number>`1 - (thrico_moments.embedding <=> ${embeddingSql})`,
          isLiked: exists(
            db
              .select()
              .from(momentReactions)
              .where(
                and(
                  eq(momentReactions.momentId, moments.id),
                  eq(momentReactions.userId, userId),
                ),
              ),
          ),
          isWishlisted: exists(
            db
              .select()
              .from(momentWishlist)
              .where(
                and(
                  eq(momentWishlist.momentId, moments.id),
                  eq(momentWishlist.userId, userId),
                ),
              ),
          ),
        })
        .from(moments)
        .leftJoin(user, eq(moments.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(
          and(
            eq(moments.entityId, entityId),
            eq(moments.status, "PUBLISHED"),
            sql`thrico_moments.id != ${momentId}`,
            cursor
              ? sql`${moments.createdAt} < ${this.decodeCursor(cursor).createdAt}`
              : undefined,
          ),
        )
        .orderBy(sql`thrico_moments.embedding <=> ${embeddingSql}`)
        .limit(limit + 1);

      return this.formatMomentConnection(results, limit, userId);
    } catch (error) {
      log.error("Error in getSimilar moments", { error, momentId });
      throw error;
    }
  }

  public static formatMomentConnection(
    results: any[],
    limit: number,
    userId: string,
  ) {
    const hasNextPage = results.length > limit;
    const data = results.slice(0, limit);

    const edges = data.map((r: any) => ({
      cursor: this.encodeCursor({
        createdAt: r.moment.createdAt,
        id: r.moment.id,
      }),
      node: {
        ...r.moment,
        owner: r.owner.id ? r.owner : null,
        isLiked: r.isLiked,
        isWishlisted: r.isWishlisted,
        isOwner: r.moment.userId === userId,
        similarityScore: r.similarity,
      },
    }));

    const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

    return {
      edges,
      pageInfo: {
        hasNextPage,
        endCursor,
      },
      totalCount: results.length, // approximation for similarity queries
    };
  }

  static async getMomentById(momentId: string, userId: string, db: any) {
    try {
      const [result] = await db
        .select({
          moment: moments,
          owner: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            headline: aboutUser.headline,
          },
          isLiked: exists(
            db
              .select()
              .from(momentReactions)
              .where(
                and(
                  eq(momentReactions.momentId, moments.id),
                  eq(momentReactions.userId, userId),
                ),
              ),
          ),
          isWishlisted: exists(
            db
              .select()
              .from(momentWishlist)
              .where(
                and(
                  eq(momentWishlist.momentId, moments.id),
                  eq(momentWishlist.userId, userId),
                ),
              ),
          ),
        })
        .from(moments)
        .leftJoin(user, eq(moments.userId, user.id))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(eq(moments.id, momentId));

      if (!result) return null;

      return {
        ...result.moment,
        owner: result.owner.id ? result.owner : null,
        isLiked: result.isLiked,
        isWishlisted: result.isWishlisted,
        isOwner: result.moment.userId === userId,
      };
    } catch (error) {
      log.error("Error in getMomentById", { error, momentId });
      throw error;
    }
  }

  static async updateMoment(
    momentId: string,
    input: { caption?: string; thumbnailUrl?: string; isAiContent?: boolean },
    userId: string,
    db: any,
  ) {
    try {
      const [moment] = await db
        .select()
        .from(moments)
        .where(and(eq(moments.id, momentId), eq(moments.userId, userId)));

      if (!moment) throw new Error("Moment not found or unauthorized");

      await db
        .update(moments)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(moments.id, momentId));

      return this.getMomentById(momentId, userId, db);
    } catch (error) {
      log.error("Error in updateMoment", { error, momentId });
      throw error;
    }
  }

  static async getMomentAnalytics(momentId: string, userId: string, db: any) {
    try {
      const [moment] = await db
        .select()
        .from(moments)
        .where(eq(moments.id, momentId));

      if (!moment) throw new Error("Moment not found");
      if (moment.userId !== userId)
        throw new Error("Unauthorized access to analytics");

      // Aggregate views data
      const viewsData = await db
        .select({
          avgWatchTime: sql<number>`AVG(${momentViews.watchDurationSeconds})`,
          completionRate: sql<number>`AVG(CASE WHEN ${momentViews.completed} THEN 1 ELSE 0 END) * 100`,
          totalViews: sql<number>`COUNT(*)`,
        })
        .from(momentViews)
        .where(eq(momentViews.momentId, momentId));

      const { avgWatchTime, completionRate } = viewsData[0];

      // Daily views for the last 7 days
      const last7Days = await db
        .select({
          date: sql<string>`DATE(${momentViews.timestamp})::text`,
          count: sql<number>`COUNT(*)`,
        })
        .from(momentViews)
        .where(
          and(
            eq(momentViews.momentId, momentId),
            sql`${momentViews.timestamp} > NOW() - INTERVAL '7 days'`,
          ),
        )
        .groupBy(sql`DATE(${momentViews.timestamp})`)
        .orderBy(sql`DATE(${momentViews.timestamp})`);

      const engagementRate =
        moment.totalViews > 0
          ? ((moment.totalReactions + moment.totalComments) /
              moment.totalViews) *
            100
          : 0;

      return {
        momentId,
        totalViews: moment.totalViews,
        totalReactions: moment.totalReactions,
        totalComments: moment.totalComments,
        totalReshares: moment.totalReshares,
        averageWatchTime: parseFloat(avgWatchTime?.toString() || "0"),
        completionRate: parseFloat(completionRate?.toString() || "0"),
        engagementRate,
        viewsByDay: last7Days,
      };
    } catch (error) {
      log.error("Error in getMomentAnalytics", { error, momentId, userId });
      throw error;
    }
  }

  static async getMyMomentsDashboard(
    userId: string,
    entityId: string,
    db: any,
  ) {
    try {
      // Overall totals
      const totalsResult = await db
        .select({
          totalMoments: sql<number>`COUNT(*)`,
          totalViews: sql<number>`SUM(${moments.totalViews})`,
          totalReactions: sql<number>`SUM(${moments.totalReactions})`,
          totalComments: sql<number>`SUM(${moments.totalComments})`,
        })
        .from(moments)
        .where(and(eq(moments.userId, userId), eq(moments.entityId, entityId)));

      const totals = totalsResult[0];

      // Recent performance (last 7 days across all moments)
      const recentPerformance = await db
        .select({
          date: sql<string>`DATE(${momentViews.timestamp})::text`,
          count: sql<number>`COUNT(*)`,
        })
        .from(momentViews)
        .innerJoin(moments, eq(momentViews.momentId, moments.id))
        .where(
          and(
            eq(moments.userId, userId),
            sql`${momentViews.timestamp} > NOW() - INTERVAL '7 days'`,
          ),
        )
        .groupBy(sql`DATE(${momentViews.timestamp})`)
        .orderBy(sql`DATE(${momentViews.timestamp})`);

      // Top moments by views
      const topMoments = await db
        .select()
        .from(moments)
        .where(and(eq(moments.userId, userId), eq(moments.entityId, entityId)))
        .orderBy(desc(moments.totalViews))
        .limit(5);

      const engagementRate =
        totals.totalViews > 0
          ? ((Number(totals.totalReactions) + Number(totals.totalComments)) /
              Number(totals.totalViews)) *
            100
          : 0;

      return {
        totalMoments: Number(totals.totalMoments || 0),
        totalViews: Number(totals.totalViews || 0),
        totalReactions: Number(totals.totalReactions || 0),
        totalComments: Number(totals.totalComments || 0),
        averageEngagementRate: engagementRate,
        topMoments: topMoments.map((m: any) => ({ ...m, isOwner: true })),
        recentPerformance: recentPerformance,
      };
    } catch (error) {
      log.error("Error in getMyMomentsDashboard", { error, userId });
      throw error;
    }
  }

  static async shareToFeed(
    momentId: string,
    userId: string,
    entityId: string,
    db: any,
  ) {
    try {
      const [moment] = await db
        .select()
        .from(moments)
        .where(eq(moments.id, momentId));

      if (!moment) throw new Error("Moment not found");
      // if (moment.userId !== userId) throw new Error("Unauthorized");

      const [feed] = await db
        .insert(userFeed)
        .values({
          userId: moment.userId, // use the moment creator's id
          entity: entityId,
          description: moment.caption,
          source: "moment",
          momentId: moment.id,
          videoUrl: moment.optimizedVideoUrl || moment.videoUrl,
          thumbnailUrl: moment.thumbnailUrl,
          status: "APPROVED",
        })
        .returning();

      return feed;
    } catch (error) {
      log.error("Error in shareToFeed", { error, momentId, userId });
      throw error;
    }
  }
}
