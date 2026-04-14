import { log } from "@thrico/logging";
import { and, eq, desc, sql } from "drizzle-orm";
import { liveSessions, user, aboutUser } from "@thrico/database";

export class LiveService {
  static async startLiveSession({
    db,
    hostId,
    entityId,
    title,
    coverImage,
    serverUrl,
  }: {
    db: any;
    hostId: string;
    entityId: string;
    title?: string;
    coverImage?: string;
    serverUrl?: string;
  }) {
    try {
      log.info("Creating live session record", { hostId, entityId, title });

      const [session] = await db
        .insert(liveSessions)
        .values({
          entityId,
        hostId,
          title,
          coverImage,
          serverUrl: serverUrl || process.env.LIVE_SERVER_URL || "ws://localhost:5555",
          isActive: true,
        })
        .returning();

      return session;
    } catch (error) {
      log.error("Error starting live session", { error, hostId, entityId });
      throw error;
    }
  }

  static async endLiveSession({
    db,
    sessionId,
    hostId,
  }: {
    db: any;
    sessionId: string;
    hostId: string;
  }) {
    try {
      log.info("Ending live session record", { sessionId, hostId });

      const [updated] = await db
        .update(liveSessions)
        .set({
          isActive: false,
          endedAt: new Date(),
        })
        .where(
          and(
            eq(liveSessions.id, sessionId),
            eq(liveSessions.hostId, hostId)
          )
        )
        .returning();

      return updated;
    } catch (error) {
      log.error("Error ending live session", { error, sessionId });
      throw error;
    }
  }

  static async getActiveLiveSessions({
    db,
    entityId,
    limit = 10,
    cursor,
  }: {
    db: any;
    entityId: string;
    limit?: number;
    cursor?: string;
  }) {
    try {
      log.debug("Getting active live sessions", { entityId, limit });

      let query = db
        .select({
          id: liveSessions.id,
          hostId: liveSessions.hostId,
          title: liveSessions.title,
          coverImage: liveSessions.coverImage,
          viewerCount: liveSessions.viewerCount,
          startedAt: liveSessions.startedAt,
          serverUrl: liveSessions.serverUrl,
          isLive: liveSessions.isActive,
          host: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            about: {
              headline: aboutUser.headline,
            },
          },
        })
        .from(liveSessions)
        .innerJoin(user, eq(liveSessions.hostId, user.id))
        .innerJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(
          and(
            eq(liveSessions.entityId, entityId),
            eq(liveSessions.isActive, true)
          )
        )
        .orderBy(desc(liveSessions.startedAt));

      // Simple implementation without cursor for now
      const results = await query.limit(limit);

      return {
        sessions: results,
        pageInfo: {
          hasNextPage: results.length === limit,
          endCursor: null, // implement if needed
        },
      };
    } catch (error) {
      log.error("Error getting active live sessions", { error, entityId });
      throw error;
    }
  }

  static async getLiveSession({
    db,
    sessionId,
  }: {
    db: any;
    sessionId: string;
  }) {
    try {
      const [session] = await db
        .select({
          id: liveSessions.id,
          hostId: liveSessions.hostId,
          title: liveSessions.title,
          coverImage: liveSessions.coverImage,
          viewerCount: liveSessions.viewerCount,
          startedAt: liveSessions.startedAt,
          serverUrl: liveSessions.serverUrl,
          isLive: liveSessions.isActive,
          host: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            about: {
              headline: aboutUser.headline,
            },
          },
        })
        .from(liveSessions)
        .innerJoin(user, eq(liveSessions.hostId, user.id))
        .innerJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(eq(liveSessions.id, sessionId));

      return session;
    } catch (error) {
      log.error("Error getting live session", { error, sessionId });
      throw error;
    }
  }
}
