import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, ne, or, sql } from "drizzle-orm";
import {
  aboutUser,
  connections,
  connectionsRequest,
  user,
  userToEntity,
  userReports,
  blockedUsers,
  userFollows,
  AppDatabase,
} from "@thrico/database";
import { GamificationEventService } from "../gamification/gamification-event.service";
import { NotificationService } from "../notification/notification.service";

export class NetworkService {
  // Helper function to get mutual friends
  private static async getMutualFriends({
    db,
    currentUserId,
    targetUserId,
    entityId,
    limit = 5,
  }: {
    db: any;
    currentUserId: string;
    targetUserId: string;
    entityId: string;
    limit?: number;
  }) {
    log.debug("Getting mutual friends", {
      currentUserId,
      targetUserId,
      entityId,
      limit,
    });

    const mutualFriends = await db
      .selectDistinct({
        id: userToEntity.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      })
      .from(userToEntity)
      .innerJoin(user, eq(userToEntity.userId, user.id))
      .where(
        and(
          eq(userToEntity.entityId, entityId),
          ne(userToEntity.id, currentUserId),
          ne(userToEntity.id, targetUserId),
          sql`EXISTS (
            SELECT 1 FROM "userConnections" c1 
            WHERE c1.entity_id = ${entityId}
            AND c1."connectionStatusEnum" = 'ACCEPTED'
            AND (
              (c1.user_id = ${currentUserId} AND c1.user2_id = ${userToEntity.id})
              OR
              (c1.user2_id = ${currentUserId} AND c1.user_id = ${userToEntity.id})
            )
          )`,
          sql`EXISTS (
            SELECT 1 FROM "userConnections" c2 
            WHERE c2.entity_id = ${entityId}
            AND c2."connectionStatusEnum" = 'ACCEPTED'
            AND (
              (c2.user_id = ${targetUserId} AND c2.user2_id = ${userToEntity.id})
              OR
              (c2.user2_id = ${targetUserId} AND c2.user_id = ${userToEntity.id})
            )
          )`,
        ),
      )
      .limit(limit);

    log.debug("Mutual friends retrieved", { count: mutualFriends.length });
    return mutualFriends;
  }

  // Helper function to add mutual friends to results
  private static async enrichWithMutualFriends({
    db,
    results,
    currentUserId,
    entityId,
    userIdField = "id",
  }: {
    db: any;
    results: any[];
    currentUserId: string;
    entityId: string;
    userIdField?: string;
  }) {
    log.debug("Enriching results with mutual friends", {
      currentUserId,
      count: results.length,
    });

    return await Promise.all(
      results.map(async (item) => {
        const targetUserId = item[userIdField];
        const mutualFriends = await this.getMutualFriends({
          db,
          currentUserId,
          targetUserId,
          entityId,
        });

        return {
          ...item,
          mutualFriends: {
            count: mutualFriends.length,
            friends: mutualFriends,
          },
        };
      }),
    );
  }

  // Helper function to apply pagination
  private static applyPagination(data: any[], limit: number, offset: number) {
    const hasMore = data.length > limit;
    const results = hasMore ? data.slice(0, limit) : data;

    return {
      data: results,
      pagination: {
        total: null,
        limit,
        offset,
        hasMore,
      },
    };
  }

  // Helper function to get blocked users condition
  private static getBlockedUsersCondition(currentUserId: string) {
    return or(
      and(
        eq(blockedUsers.blockerId, currentUserId),
        eq(blockedUsers.blockedUserId, userToEntity.id),
      ),
      and(
        eq(blockedUsers.blockedUserId, currentUserId),
        eq(blockedUsers.blockerId, userToEntity.id),
      ),
    );
  }

  // Helper function to get connection status query
  private static getConnectionStatusQuery(currentUserId: string) {
    return sql<string>`
      CASE 
        WHEN ${connectionsRequest.sender} = ${currentUserId} AND ${connectionsRequest.connectionStatusEnum} = 'PENDING' THEN 'REQUEST_SEND'
        WHEN ${connectionsRequest.receiver} = ${currentUserId} AND ${connectionsRequest.connectionStatusEnum} = 'PENDING' THEN 'REQUEST_RECEIVED'
        WHEN ${connectionsRequest.connectionStatusEnum} = 'ACCEPTED' THEN 'CONNECTED'
        ELSE 'NO_CONNECTION'
      END
    `.as("status");
  }

  static async getNetwork({
    db,
    currentUserId,
    entityId,
    limit = 10,
    offset = 0,
    search = "",
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting network", {
        currentUserId,
        entityId,
        limit,
        offset,
        search,
      });

      const userStatus = db.$with("user_status").as(
        db
          .selectDistinct({
            id: userToEntity.id,
            entityId: userToEntity.entityId,
            isApproved: true,
            isRequested: true,
            firstName: user.firstName,
            lastName: user.lastName,
            isOnline:
              sql`CASE WHEN ${userToEntity.lastActive} + interval '10 minutes' > now() THEN true ELSE false END`.as(
                "is_online",
              ),
            avatar: user.avatar,
            cover: user.cover,
            designation: aboutUser.headline,
            status: this.getConnectionStatusQuery(currentUserId),
            location: user.location,
            mutualFriendsCount: sql<number>`(
              SELECT COUNT(DISTINCT ute.id)
              FROM "userToEntity" ute
              WHERE ute.entity_id = ${entityId}
              AND ute.id != ${currentUserId}
              AND ute.id != ${userToEntity.id}
              AND EXISTS (
                SELECT 1 FROM "userConnections" c1 
                WHERE c1.entity_id = ${entityId}
                AND c1."connectionStatusEnum" = 'ACCEPTED'
                AND (
                  (c1.user_id = ${currentUserId} AND c1.user2_id = ute.id)
                  OR
                  (c1.user2_id = ${currentUserId} AND c1.user_id = ute.id)
                )
              )
              AND EXISTS (
                SELECT 1 FROM "userConnections" c2 
                WHERE c2.entity_id = ${entityId}
                AND c2."connectionStatusEnum" = 'ACCEPTED'
                AND (
                  (c2.user_id = ${userToEntity.id} AND c2.user2_id = ute.id)
                  OR
                  (c2.user2_id = ${userToEntity.id} AND c2.user_id = ute.id)
                )
              )
            )`.as("mutual_friends_count"),
          })
          .from(userToEntity)
          .leftJoin(
            connectionsRequest,
            or(
              and(
                eq(userToEntity.id, connectionsRequest.receiver),
                eq(connectionsRequest.sender, currentUserId),
              ),
              and(
                eq(userToEntity.id, connectionsRequest.sender),
                eq(connectionsRequest.receiver, currentUserId),
              ),
            ),
          )
          .leftJoin(blockedUsers, this.getBlockedUsersCondition(currentUserId))
          .innerJoin(user, eq(userToEntity.userId, user.id))
          .innerJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
          .where(sql`${blockedUsers.id} IS NULL`),
      );

      const searchCondition = search
        ? sql`(
            LOWER(${userStatus.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${userStatus.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${userStatus.firstName}, ' ', ${
              userStatus.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`
        : sql`true`;

      const data = await db
        .with(userStatus)
        .select()
        .from(userStatus)
        .where(
          and(
            ne(userStatus.id, currentUserId),
            eq(userStatus.entityId, entityId),
            searchCondition,
          ),
        )
        .orderBy(sql`${userStatus.mutualFriendsCount} DESC`)
        .limit(limit + 1)
        .offset(offset);

      const { data: results } = this.applyPagination(data, limit, offset);

      // Enrich each user with their number of connections
      const enrichedResults = await Promise.all(
        results.map(async (item) => {
          const [connectionsCount] = await db
            .select({
              count: sql<number>`count(*)`.as("count"),
            })
            .from(connections)
            .where(
              and(
                eq(connections.entity, entityId),
                eq(connections.connectionStatusEnum, "ACCEPTED"),
                or(
                  eq(connections.user1, item.id),
                  eq(connections.user2, item.id),
                ),
              ),
            );
          const mutualFriends = await this.getMutualFriends({
            db,
            currentUserId,
            targetUserId: item.id,
            entityId,
          });
          return {
            ...item,
            mutualFriends: {
              count: mutualFriends.length,
              friends: mutualFriends,
            },
            numberOfConnections: Number(connectionsCount?.count || 0),
          };
        }),
      );

      log.info("Network retrieved", {
        currentUserId,
        count: enrichedResults.length,
      });

      return {
        data: enrichedResults,
        pagination: {
          total: null,
          limit,
          offset,
          hasMore: data.length > limit,
        },
      };
    } catch (error) {
      log.error("Error in getNetwork", { error, currentUserId, entityId });
      throw error;
    }
  }

  static async getNetworkUserProfile({
    db,
    currentUserId,
    entityId,
    id,
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    id: string;
  }) {
    try {
      if (!currentUserId || !entityId || !id) {
        throw new GraphQLError(
          "User ID, Entity ID, and Profile ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Getting user profile", {
        currentUserId,
        entityId,
        profileId: id,
      });

      const statusQuery = this.getConnectionStatusQuery(currentUserId);

      const query = await db
        .select({ status: statusQuery })
        .from(connectionsRequest)
        .where(
          and(
            eq(connectionsRequest.entity, entityId),
            or(
              and(
                eq(connectionsRequest.sender, currentUserId),
                eq(connectionsRequest.receiver, id),
              ),
              and(
                eq(connectionsRequest.sender, id),
                eq(connectionsRequest.receiver, currentUserId),
              ),
            ),
          ),
        )
        .limit(1);

      const condition = await db.query.userToEntity.findFirst({
        where: (userToEntity: any, { eq }: any) =>
          and(eq(userToEntity.id, id), eq(userToEntity.entityId, entityId)),
        with: {
          user: {
            with: {
              profile: true,
              about: true,
            },
          },
        },
      });

      if (!condition) {
        throw new GraphQLError("User profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const mutualFriends = await this.getMutualFriends({
        db,
        currentUserId,
        targetUserId: id,
        entityId,
      });

      const [followStatus] = await db
        .select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, currentUserId),
            eq(userFollows.followingId, id),
            eq(userFollows.entityId, entityId),
          ),
        )
        .limit(1);

      log.info("User profile retrieved", { currentUserId, profileId: id });

      return {
        ...condition,
        status: query[0] ? query[0].status : "NO_CONNECTION",
        isFollowing: !!followStatus,
        mutualFriends: {
          count: mutualFriends.length,
          friends: mutualFriends,
        },
      };
    } catch (error) {
      log.error("Error in getNetworkUserProfile", {
        error,
        currentUserId,
        entityId,
        profileId: id,
      });
      throw error;
    }
  }

  static async getUserProfile({
    db,
    currentUserId,
    entityId,
    userId,
  }: {
    db: AppDatabase;
    currentUserId: string;
    entityId: string;
    userId: string;
  }) {
    try {
      const user = await db.query.user.findFirst({
        where: (user: any, { eq }: any) => eq(user.id, userId),
        with: {
          userEntity: true,
        },
      });

      const id = user?.userEntity?.id;

      if (!user) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      if (!currentUserId || !entityId || !id) {
        throw new GraphQLError(
          "User ID, Entity ID, and Profile ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Getting user profile", {
        currentUserId,
        entityId,
        profileId: id,
      });

      const statusQuery = this.getConnectionStatusQuery(currentUserId);

      const query = await db
        .select({ status: statusQuery })
        .from(connectionsRequest)
        .where(
          and(
            eq(connectionsRequest.entity, entityId),
            or(
              and(
                eq(connectionsRequest.sender, currentUserId),
                eq(connectionsRequest.receiver, id),
              ),
              and(
                eq(connectionsRequest.sender, id),
                eq(connectionsRequest.receiver, currentUserId),
              ),
            ),
          ),
        )
        .limit(1);

      const condition = await db.query.userToEntity.findFirst({
        where: (userToEntity: any, { eq }: any) =>
          and(eq(userToEntity.id, id), eq(userToEntity.entityId, entityId)),
        with: {
          user: {
            with: {
              profile: true,
              about: true,
            },
          },
        },
      });

      if (!condition) {
        throw new GraphQLError("User profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const mutualFriends = await this.getMutualFriends({
        db,
        currentUserId,
        targetUserId: id,
        entityId,
      });

      const [followStatus] = await db
        .select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, currentUserId),
            eq(userFollows.followingId, id),
            eq(userFollows.entityId, entityId),
          ),
        )
        .limit(1);

      log.info("User profile retrieved", { currentUserId, profileId: id });

      return {
        ...condition,
        status: query[0] ? query[0].status : "NO_CONNECTION",
        isFollowing: !!followStatus,
        mutualFriends: {
          count: mutualFriends.length,
          friends: mutualFriends,
        },
      };
    } catch (error) {
      log.error("Error in getUserProfile", {
        error,
        currentUserId,
        entityId,
        profileId: userId,
      });
      throw error;
    }
  }

  static async connectAsConnection({
    db,
    sender,
    receiver,
    entity,
    id,
  }: {
    db: any;
    sender: string;
    receiver: string;
    entity: string;
    id: string;
  }) {
    try {
      if (!sender || !receiver || !entity) {
        throw new GraphQLError("Sender, Receiver, and Entity are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (sender === receiver) {
        throw new GraphQLError("You cannot connect with yourself.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Starting connectAsConnection", { sender, receiver, entity });

      // 1. Fetch sender and receiver user info safely
      const [senderRecord, receiverRecord] = await Promise.all([
        db.query.userToEntity.findFirst({
          where: and(
            eq(userToEntity.id, sender),
            eq(userToEntity.entityId, entity),
          ),
          with: { user: true },
        }),
        db.query.userToEntity.findFirst({
          where: and(
            eq(userToEntity.id, receiver),
            eq(userToEntity.entityId, entity),
          ),
          with: { user: true },
        }),
      ]);

      if (!senderRecord || !receiverRecord) {
        throw new GraphQLError("Sender or Receiver not found in this entity.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // 2. Comprehensive Validations
      const validationError = await db.transaction(async (tx: any) => {
        // A. Check for blocks
        const block = await tx.query.blockedUsers.findFirst({
          where: or(
            and(
              eq(blockedUsers.blockerId, sender),
              eq(blockedUsers.blockedUserId, receiver),
            ),
            and(
              eq(blockedUsers.blockerId, receiver),
              eq(blockedUsers.blockedUserId, sender),
            ),
          ),
        });
        if (block) return "Connection blocked by privacy settings.";

        // B. Check for existing connection
        const existingConnection = await tx.query.connections.findFirst({
          where: and(
            eq(connections.entity, entity),
            eq(connections.connectionStatusEnum, "ACCEPTED"),
            or(
              and(
                eq(connections.user1, senderRecord.userId),
                eq(connections.user2, receiverRecord.userId),
              ),
              and(
                eq(connections.user1, receiverRecord.userId),
                eq(connections.user2, senderRecord.userId),
              ),
            ),
          ),
        });
        if (existingConnection)
          return "You are already connected with this user.";

        // C. Check for existing request
        const existingRequest = await tx.query.connectionsRequest.findFirst({
          where: or(
            and(
              eq(connectionsRequest.sender, sender),
              eq(connectionsRequest.receiver, receiver),
            ),
            and(
              eq(connectionsRequest.sender, receiver),
              eq(connectionsRequest.receiver, sender),
            ),
          ),
        });

        if (existingRequest) {
          if (existingRequest.sender === sender) {
            return "Connection request already sent.";
          } else {
            return "This user has already sent you a connection request. Please accept it instead.";
          }
        }

        return null;
      });

      if (validationError) {
        throw new GraphQLError(validationError, {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // 3. Create the request and follow
      await db.transaction(async (tx: any) => {
        await tx.insert(connectionsRequest).values({
          sender: sender,
          receiver: receiver,
          connectionStatusEnum: "PENDING",
          entity: entity,
        });

        const existingFollow = await tx.query.userFollows.findFirst({
          where: and(
            eq(userFollows.followerId, sender),
            eq(userFollows.followingId, receiver),
            eq(userFollows.entityId, entity),
          ),
        });

        if (!existingFollow) {
          await tx.insert(userFollows).values({
            followerId: sender,
            followingId: receiver,
            entityId: entity,
          });
        }
      });

      // 4. Async Tasks: Gamification, DB Notification, Push Notification
      log.info("Connection request successfully created", { sender, receiver });

      // A. Gamification
      await GamificationEventService.triggerEvent({
        triggerId: "tr-net-send",
        moduleId: "network",
        userId: senderRecord.userId, // Global ID
        entityId: entity,
      });

      const senderName = `${senderRecord.user.firstName} ${senderRecord.user.lastName}`;

      // B. Database Notification (linked to userToEntity.id)
      await NotificationService.createNotification({
        db,
        userId: receiver, // userToEntity.id
        senderId: sender, // userToEntity.id
        entityId: entity,
        content: `${senderName} wants to connect with you.`,
        notificationType: "CONNECTION_REQUEST",
      });

      // C. Push Notification (uses global userId)
      await NotificationService.sendPushNotification({
        userId: receiverRecord.userId, // Global ID
        entityId: entity,
        title: "Connection Request",
        body: `${senderName} wants to connect with you.`,
        payload: {
          type: "CONNECTION_REQUEST",
          senderId: sender,
        },
      });

      return {
        id: id,
        status: "REQUEST_SEND",
      };
    } catch (error) {
      log.error("Error in connectAsConnection", {
        error,
        sender,
        receiver,
        entity,
      });
      throw error;
    }
  }

  static async acceptConnection({
    db,
    sender,
    receiver,
    entity,
    id,
  }: {
    db: any;
    sender: string;
    receiver: string;
    entity: string;
    id: string;
  }) {
    try {
      if (!sender || !receiver || !entity) {
        throw new GraphQLError("Sender, Receiver, and Entity are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Starting acceptConnection", { sender, receiver, entity });

      // 1. Fetch sender and receiver info safely
      const [senderRecord, receiverRecord] = await Promise.all([
        db.query.userToEntity.findFirst({
          where: and(
            eq(userToEntity.id, sender),
            eq(userToEntity.entityId, entity),
          ),
          with: { user: true },
        }),
        db.query.userToEntity.findFirst({
          where: and(
            eq(userToEntity.id, receiver),
            eq(userToEntity.entityId, entity),
          ),
          with: { user: true },
        }),
      ]);

      if (!senderRecord || !receiverRecord) {
        throw new GraphQLError("Sender or Receiver not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // 2. Perform accepting logic in transaction
      const transition = await db.transaction(async (tx: any) => {
        const friendRequest = await tx.query.connectionsRequest.findFirst({
          where: and(
            eq(connectionsRequest.sender, sender),
            eq(connectionsRequest.receiver, receiver),
            eq(connectionsRequest.connectionStatusEnum, "PENDING"),
          ),
        });

        if (!friendRequest) {
          throw new GraphQLError(
            "Connection request not found or already processed.",
            {
              extensions: { code: "NOT_FOUND" },
            },
          );
        }

        await tx
          .update(connectionsRequest)
          .set({ connectionStatusEnum: "ACCEPTED" })
          .where(eq(connectionsRequest.id, friendRequest.id));

        await tx.insert(connections).values({
          user1: friendRequest.sender, // This is still the userToEntity ID or global?
          user2: friendRequest.receiver,
          entity,
          connectionStatusEnum: "ACCEPTED",
        });

        const existingFollow = await tx.query.userFollows.findFirst({
          where: and(
            eq(userFollows.followerId, receiver),
            eq(userFollows.followingId, sender),
            eq(userFollows.entityId, entity),
          ),
        });

        if (!existingFollow) {
          await tx.insert(userFollows).values({
            followerId: receiver,
            followingId: sender,
            entityId: entity,
          });
        }

        return true;
      });

      // 3. Async Tasks: Gamification, DB Notification, Push Notification
      if (transition) {
        log.info("Connection accepted successfully", { sender, receiver });

        // A. Gamification
        await GamificationEventService.triggerEvent({
          triggerId: "tr-net-accept",
          moduleId: "network",
          userId: senderRecord.userId, // Global ID of original requester
          entityId: entity,
        });

        const receiverName = `${receiverRecord.user.firstName} ${receiverRecord.user.lastName}`;

        // B. Database Notification (linked to userToEntity.id)
        await NotificationService.createNotification({
          db,
          userId: sender, // Original requester (userToEntity.id)
          senderId: receiver, // Acceptor (userToEntity.id)
          entityId: entity,
          content: `${receiverName} accepted your connection request.`,
          notificationType: "CONNECTION_ACCEPTED",
        });

        // C. Push Notification (uses global userId)
        await NotificationService.sendPushNotification({
          userId: senderRecord.userId, // Global ID of original requester
          entityId: entity,
          title: "Connection Accepted",
          body: `${receiverName} accepted your connection request.`,
          payload: {
            type: "CONNECTION_ACCEPTED",
            senderId: receiver,
          },
        });

        return { id: id, status: "CONNECTED" };
      } else {
        throw new GraphQLError("Failed to accept connection.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in acceptConnection", {
        error,
        sender,
        receiver,
        entity,
      });
      throw error;
    }
  }

  static async withdrawConnection({
    db,
    sender,
    receiver,
    entity,
    id,
  }: {
    db: any;
    sender: string;
    receiver: string;
    entity: string;
    id: string;
  }) {
    try {
      if (!sender || !receiver || !entity) {
        throw new GraphQLError("Sender, Receiver, and Entity are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Withdrawing connection request", { sender, receiver, entity });

      const result = await db.transaction(async (tx: any) => {
        const [request] = await tx
          .select()
          .from(connectionsRequest)
          .where(
            and(
              eq(connectionsRequest.sender, sender),
              eq(connectionsRequest.receiver, receiver),
              eq(connectionsRequest.entity, entity),
              eq(connectionsRequest.connectionStatusEnum, "PENDING"),
            ),
          )
          .limit(1);

        if (!request) {
          throw new GraphQLError("Connection request not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await tx
          .delete(connectionsRequest)
          .where(eq(connectionsRequest.id, request.id));

        return true;
      });

      if (result) {
        log.info("Connection request withdrawn", { sender, receiver });
        return { id: id, status: "NO_CONNECTION" };
      } else {
        throw new GraphQLError("Failed to withdraw connection request.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in withdrawConnection", {
        error,
        sender,
        receiver,
        entity,
      });
      throw error;
    }
  }

  static async removeConnection({
    db,
    currentUserId,
    targetUserId,
    entity,
    id,
  }: {
    db: any;
    currentUserId: string;
    targetUserId: string;
    entity: string;
    id: string;
  }) {
    try {
      if (!currentUserId || !targetUserId || !entity) {
        throw new GraphQLError(
          "Current User ID, Target User ID, and Entity are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Removing connection", { currentUserId, targetUserId, entity });

      const result = await db.transaction(async (tx: any) => {
        const [connection] = await tx
          .select()
          .from(connections)
          .where(
            and(
              eq(connections.entity, entity),
              eq(connections.connectionStatusEnum, "ACCEPTED"),
              or(
                and(
                  eq(connections.user1, currentUserId),
                  eq(connections.user2, targetUserId),
                ),
                and(
                  eq(connections.user1, targetUserId),
                  eq(connections.user2, currentUserId),
                ),
              ),
            ),
          )
          .limit(1);

        if (!connection) {
          throw new GraphQLError("Connection not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await tx.delete(connections).where(eq(connections.id, connection.id));

        await tx
          .delete(connectionsRequest)
          .where(
            or(
              and(
                eq(connectionsRequest.sender, currentUserId),
                eq(connectionsRequest.receiver, targetUserId),
                eq(connectionsRequest.entity, entity),
              ),
              and(
                eq(connectionsRequest.sender, targetUserId),
                eq(connectionsRequest.receiver, currentUserId),
                eq(connectionsRequest.entity, entity),
              ),
            ),
          );

        await tx
          .delete(userFollows)
          .where(
            or(
              and(
                eq(userFollows.followerId, currentUserId),
                eq(userFollows.followingId, targetUserId),
                eq(userFollows.entityId, entity),
              ),
              and(
                eq(userFollows.followerId, targetUserId),
                eq(userFollows.followingId, currentUserId),
                eq(userFollows.entityId, entity),
              ),
            ),
          );

        return true;
      });

      if (result) {
        log.info("Connection removed", { currentUserId, targetUserId });
        return { id: id, status: "NO_CONNECTION" };
      } else {
        throw new GraphQLError("Failed to remove connection.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in removeConnection", {
        error,
        currentUserId,
        targetUserId,
        entity,
      });
      throw error;
    }
  }

  static async rejectConnection({
    db,
    sender,
    receiver,
    entity,
    id,
  }: {
    db: any;
    sender: string;
    receiver: string;
    entity: string;
    id: string;
  }) {
    try {
      if (!sender || !receiver || !entity) {
        throw new GraphQLError("Sender, Receiver, and Entity are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Rejecting connection request", { sender, receiver, entity });

      const result = await db.transaction(async (tx: any) => {
        const [request] = await tx
          .select()
          .from(connectionsRequest)
          .where(
            and(
              eq(connectionsRequest.sender, sender),
              eq(connectionsRequest.receiver, receiver),
              eq(connectionsRequest.entity, entity),
              eq(connectionsRequest.connectionStatusEnum, "PENDING"),
            ),
          )
          .limit(1);

        if (!request) {
          throw new GraphQLError("Connection request not found.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await tx
          .delete(connectionsRequest)
          .where(eq(connectionsRequest.id, request.id));

        return true;
      });

      if (result) {
        log.info("Connection request rejected", { sender, receiver });
        return { id: id, status: "NO_CONNECTION" };
      } else {
        throw new GraphQLError("Failed to reject connection request.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in rejectConnection", {
        error,
        sender,
        receiver,
        entity,
      });
      throw error;
    }
  }

  static async getConnectionStats({
    db,
    currentUserId,
    entityId,
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting connection stats", { currentUserId, entityId });

      const [connectionsCount] = await db
        .select({
          count: sql<number>`count(*)`.as("count"),
        })
        .from(connections)
        .where(
          and(
            eq(connections.entity, entityId),
            eq(connections.connectionStatusEnum, "ACCEPTED"),
            or(
              eq(connections.user1, currentUserId),
              eq(connections.user2, currentUserId),
            ),
          ),
        );

      const [requestsCount] = await db
        .select({
          count: sql<number>`count(*)`.as("count"),
        })
        .from(connectionsRequest)
        .where(
          and(
            eq(connectionsRequest.receiver, currentUserId),
            eq(connectionsRequest.connectionStatusEnum, "PENDING"),
            eq(connectionsRequest.entity, entityId),
          ),
        );

      const stats = {
        totalConnections: Number(connectionsCount?.count || 0),
        pendingRequests: Number(requestsCount?.count || 0),
      };

      log.info("Connection stats retrieved", { currentUserId, ...stats });
      return stats;
    } catch (error) {
      log.error("Error in getConnectionStats", {
        error,
        currentUserId,
        entityId,
      });
      throw error;
    }
  }

  static async reportProfile({
    db,
    reporterId,
    reportedUserId,
    entityId,
    reason,
    description,
  }: {
    db: any;
    reporterId: string;
    reportedUserId: string;
    entityId: string;
    reason: string;
    description?: string;
  }) {
    try {
      if (!reporterId || !reportedUserId || !entityId || !reason) {
        throw new GraphQLError(
          "Reporter ID, Reported User ID, Entity ID, and Reason are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      if (reporterId === reportedUserId) {
        throw new GraphQLError("You cannot report yourself.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Reporting profile", {
        reporterId,
        reportedUserId,
        entityId,
        reason,
      });

      const result = await db.transaction(async (tx: any) => {
        const reportedUser = await tx.query.userToEntity.findFirst({
          where: and(
            eq(userToEntity.id, reportedUserId),
            eq(userToEntity.entityId, entityId),
          ),
        });

        if (!reportedUser) {
          throw new GraphQLError("User not found in this entity.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const existingReport = await tx
          .select()
          .from(userReports)
          .where(
            and(
              eq(userReports.reporterId, reporterId),
              eq(userReports.reportedUserId, reportedUserId),
              eq(userReports.entityId, entityId),
            ),
          )
          .limit(1);

        if (existingReport.length > 0) {
          throw new GraphQLError("You have already reported this user.", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        await tx.insert(userReports).values({
          reporterId,
          reportedUserId,
          entityId,
          reason,
          description,
          status: "PENDING",
        });

        return true;
      });

      if (result) {
        log.info("Profile reported successfully", {
          reporterId,
          reportedUserId,
        });
        return {
          success: true,
          message: "Profile reported successfully",
        };
      } else {
        throw new GraphQLError("Failed to report profile.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in reportProfile", {
        error,
        reporterId,
        reportedUserId,
        entityId,
      });
      throw error;
    }
  }

  static async blockUser({
    db,
    blockerId,
    blockedUserId,
    entityId,
  }: {
    db: any;
    blockerId: string;
    blockedUserId: string;
    entityId: string;
  }) {
    try {
      if (!blockerId || !blockedUserId || !entityId) {
        throw new GraphQLError(
          "Blocker ID, Blocked User ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      if (blockerId === blockedUserId) {
        throw new GraphQLError("You cannot block yourself.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Blocking user", { blockerId, blockedUserId, entityId });

      const result = await db.transaction(async (tx: any) => {
        const existingBlock = await tx
          .select()
          .from(blockedUsers)
          .where(
            and(
              eq(blockedUsers.blockerId, blockerId),
              eq(blockedUsers.blockedUserId, blockedUserId),
              eq(blockedUsers.entityId, entityId),
            ),
          )
          .limit(1);

        if (existingBlock.length > 0) {
          throw new GraphQLError("User is already blocked.", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        await tx.insert(blockedUsers).values({
          blockerId,
          blockedUserId,
          entityId,
        });

        await tx
          .delete(connections)
          .where(
            and(
              eq(connections.entity, entityId),
              or(
                and(
                  eq(connections.user1, blockerId),
                  eq(connections.user2, blockedUserId),
                ),
                and(
                  eq(connections.user1, blockedUserId),
                  eq(connections.user2, blockerId),
                ),
              ),
            ),
          );

        await tx
          .delete(connectionsRequest)
          .where(
            and(
              eq(connectionsRequest.entity, entityId),
              or(
                and(
                  eq(connectionsRequest.sender, blockerId),
                  eq(connectionsRequest.receiver, blockedUserId),
                ),
                and(
                  eq(connectionsRequest.sender, blockedUserId),
                  eq(connectionsRequest.receiver, blockerId),
                ),
              ),
            ),
          );

        await tx
          .delete(userFollows)
          .where(
            and(
              eq(userFollows.entityId, entityId),
              or(
                and(
                  eq(userFollows.followerId, blockerId),
                  eq(userFollows.followingId, blockedUserId),
                ),
                and(
                  eq(userFollows.followerId, blockedUserId),
                  eq(userFollows.followingId, blockerId),
                ),
              ),
            ),
          );

        return true;
      });

      if (result) {
        log.info("User blocked successfully", { blockerId, blockedUserId });
        return {
          success: true,
          message: "User blocked successfully",
        };
      } else {
        throw new GraphQLError("Failed to block user.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in blockUser", {
        error,
        blockerId,
        blockedUserId,
        entityId,
      });
      throw error;
    }
  }

  static async unblockUser({
    db,
    blockerId,
    blockedUserId,
    entityId,
  }: {
    db: any;
    blockerId: string;
    blockedUserId: string;
    entityId: string;
  }) {
    try {
      if (!blockerId || !blockedUserId || !entityId) {
        throw new GraphQLError(
          "Blocker ID, Blocked User ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Unblocking user", { blockerId, blockedUserId, entityId });

      const result = await db.transaction(async (tx: any) => {
        const [block] = await tx
          .select()
          .from(blockedUsers)
          .where(
            and(
              eq(blockedUsers.blockerId, blockerId),
              eq(blockedUsers.blockedUserId, blockedUserId),
              eq(blockedUsers.entityId, entityId),
            ),
          )
          .limit(1);

        if (!block) {
          throw new GraphQLError("User is not blocked.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await tx.delete(blockedUsers).where(eq(blockedUsers.id, block.id));

        return blockedUserId;
      });

      if (result) {
        log.info("User unblocked successfully", { blockerId, blockedUserId });
        return {
          success: true,
          message: "User unblocked successfully",
          id: result,
        };
      } else {
        throw new GraphQLError("Failed to unblock user.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in unblockUser", {
        error,
        blockerId,
        blockedUserId,
        entityId,
      });
      throw error;
    }
  }

  static async getBlockedUsers({
    db,
    currentUserId,
    entityId,
    limit = 10,
    offset = 0,
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting blocked users", {
        currentUserId,
        entityId,
        limit,
        offset,
      });

      const data = await db
        .select({
          id: userToEntity.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          blockedAt: blockedUsers.createdAt,
        })
        .from(blockedUsers)
        .innerJoin(
          userToEntity,
          eq(blockedUsers.blockedUserId, userToEntity.id),
        )
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .where(
          and(
            eq(blockedUsers.blockerId, currentUserId),
            eq(blockedUsers.entityId, entityId),
          ),
        )
        .limit(limit + 1)
        .offset(offset);

      const result = this.applyPagination(data, limit, offset);
      log.info("Blocked users retrieved", {
        currentUserId,
        count: result.data.length,
      });
      return result;
    } catch (error) {
      log.error("Error in getBlockedUsers", { error, currentUserId, entityId });
      throw error;
    }
  }

  static async getMyConnections({
    db,
    currentUserId,
    entityId,
    limit = 10,
    offset = 0,
    search = "",
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting my connections", {
        currentUserId,
        entityId,
        limit,
        offset,
        search,
      });

      const searchCondition = search
        ? sql`(
            LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${user.firstName}, ' ', ${
              user.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`
        : sql`true`;

      const data = await db
        .selectDistinct({
          id: userToEntity.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          cover: user.cover,
          designation: aboutUser.headline,
          isOnline:
            sql`CASE WHEN ${userToEntity.lastActive} + interval '10 minutes' > now() THEN true ELSE false END`.as(
              "is_online",
            ),
          connectedAt: connections.createdAt,
          status: sql<string>`'CONNECTED'`.as("status"),
        })
        .from(connections)
        .innerJoin(
          userToEntity,
          or(
            and(
              eq(connections.user1, currentUserId),
              eq(connections.user2, userToEntity.id),
            ),
            and(
              eq(connections.user2, currentUserId),
              eq(connections.user1, userToEntity.id),
            ),
          ),
        )
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
        .leftJoin(blockedUsers, this.getBlockedUsersCondition(currentUserId))
        .where(
          and(
            eq(connections.entity, entityId),
            eq(connections.connectionStatusEnum, "ACCEPTED"),
            sql`${blockedUsers.id} IS NULL`,
            searchCondition,
          ),
        )
        .limit(limit + 1)
        .offset(offset);

      const { data: results } = this.applyPagination(data, limit, offset);

      const enrichedResults = await Promise.all(
        results.map(async (item) => {
          const [connectionsCount] = await db
            .select({
              count: sql<number>`count(*)`.as("count"),
            })
            .from(connections)
            .where(
              and(
                eq(connections.entity, entityId),
                eq(connections.connectionStatusEnum, "ACCEPTED"),
                or(
                  eq(connections.user1, item.id),
                  eq(connections.user2, item.id),
                ),
              ),
            );
          const mutualFriends = await this.getMutualFriends({
            db,
            currentUserId,
            targetUserId: item.id,
            entityId,
          });
          return {
            ...item,
            mutualFriends: {
              count: mutualFriends.length,
              friends: mutualFriends,
            },
            numberOfConnections: Number(connectionsCount?.count || 0),
          };
        }),
      );

      log.info("My connections retrieved", {
        currentUserId,
        count: enrichedResults.length,
      });

      return {
        data: enrichedResults,
        pagination: {
          total: null,
          limit,
          offset,
          hasMore: data.length > limit,
        },
      };
    } catch (error) {
      log.error("Error in getMyConnections", {
        error,
        currentUserId,
        entityId,
      });
      throw error;
    }
  }

  static async getConnectionRequests({
    db,
    currentUserId,
    entityId,
    limit = 10,
    offset = 0,
    search = "",
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting connection requests", {
        currentUserId,
        entityId,
        limit,
        offset,
        search,
      });

      const searchCondition = search
        ? sql`(
            LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${user.firstName}, ' ', ${
              user.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`
        : sql`true`;

      const data = await db
        .select({
          id: connectionsRequest.id,
          senderId: connectionsRequest.sender,
          receiverId: connectionsRequest.receiver,
          status: connectionsRequest.connectionStatusEnum,
          createdAt: connectionsRequest.createdAt,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          designation: aboutUser.headline,
        })
        .from(connectionsRequest)
        .innerJoin(userToEntity, eq(connectionsRequest.sender, userToEntity.id))
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
        .leftJoin(blockedUsers, this.getBlockedUsersCondition(currentUserId))
        .where(
          and(
            eq(connectionsRequest.receiver, currentUserId),
            eq(connectionsRequest.connectionStatusEnum, "PENDING"),
            eq(connectionsRequest.entity, entityId),
            sql`${blockedUsers.id} IS NULL`,
            searchCondition,
          ),
        )
        .limit(limit + 1)
        .offset(offset);

      const { data: results } = this.applyPagination(data, limit, offset);

      const enrichedResults = await Promise.all(
        results.map(async (item) => {
          const [connectionsCount] = await db
            .select({
              count: sql<number>`count(*)`.as("count"),
            })
            .from(connections)
            .where(
              and(
                eq(connections.entity, entityId),
                eq(connections.connectionStatusEnum, "ACCEPTED"),
                or(
                  eq(connections.user1, item.senderId),
                  eq(connections.user2, item.senderId),
                ),
              ),
            );
          const mutualFriends = await this.getMutualFriends({
            db,
            currentUserId,
            targetUserId: item.senderId,
            entityId,
          });
          return {
            ...item,
            mutualFriends: {
              count: mutualFriends.length,
              friends: mutualFriends,
            },
            numberOfConnections: Number(connectionsCount?.count || 0),
          };
        }),
      );

      log.info("Connection requests retrieved", {
        currentUserId,
        count: enrichedResults.length,
      });

      return {
        data: enrichedResults,
        pagination: {
          total: null,
          limit,
          offset,
          hasMore: data.length > limit,
        },
      };
    } catch (error) {
      log.error("Error in getConnectionRequests", {
        error,
        currentUserId,
        entityId,
      });
      throw error;
    }
  }

  static async followUser({
    db,
    followerId,
    followingId,
    entityId,
  }: {
    db: any;
    followerId: string;
    followingId: string;
    entityId: string;
  }) {
    try {
      if (!followerId || !followingId || !entityId) {
        throw new GraphQLError(
          "Follower ID, Following ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      if (followerId === followingId) {
        throw new GraphQLError("You cannot follow yourself.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Following user", { followerId, followingId, entityId });

      const result = await db.transaction(async (tx: any) => {
        const existingFollow = await tx
          .select()
          .from(userFollows)
          .where(
            and(
              eq(userFollows.followerId, followerId),
              eq(userFollows.followingId, followingId),
              eq(userFollows.entityId, entityId),
            ),
          )
          .limit(1);

        if (existingFollow.length > 0) {
          throw new GraphQLError("You are already following this user.", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const blocked = await tx
          .select()
          .from(blockedUsers)
          .where(
            and(
              eq(blockedUsers.entityId, entityId),
              or(
                and(
                  eq(blockedUsers.blockerId, followerId),
                  eq(blockedUsers.blockedUserId, followingId),
                ),
                and(
                  eq(blockedUsers.blockerId, followingId),
                  eq(blockedUsers.blockedUserId, followerId),
                ),
              ),
            ),
          )
          .limit(1);

        if (blocked.length > 0) {
          throw new GraphQLError("Cannot follow this user.", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        await tx.insert(userFollows).values({
          followerId,
          followingId,
          entityId,
        });

        return true;
      });

      if (result) {
        log.info("User followed successfully", { followerId, followingId });
        return {
          success: true,
          message: "User followed successfully",
          id: followingId,
        };
      } else {
        throw new GraphQLError("Failed to follow user.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in followUser", {
        error,
        followerId,
        followingId,
        entityId,
      });
      throw error;
    }
  }

  static async unfollowUser({
    db,
    followerId,
    followingId,
    entityId,
  }: {
    db: any;
    followerId: string;
    followingId: string;
    entityId: string;
  }) {
    try {
      if (!followerId || !followingId || !entityId) {
        throw new GraphQLError(
          "Follower ID, Following ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Unfollowing user", { followerId, followingId, entityId });

      const result = await db.transaction(async (tx: any) => {
        const [follow] = await tx
          .select()
          .from(userFollows)
          .where(
            and(
              eq(userFollows.followerId, followerId),
              eq(userFollows.followingId, followingId),
              eq(userFollows.entityId, entityId),
            ),
          )
          .limit(1);

        if (!follow) {
          throw new GraphQLError("You are not following this user.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        await tx.delete(userFollows).where(eq(userFollows.id, follow.id));

        return true;
      });

      if (result) {
        log.info("User unfollowed successfully", { followerId, followingId });
        return {
          success: true,
          message: "User unfollowed successfully",
          id: followingId,
        };
      } else {
        throw new GraphQLError("Failed to unfollow user.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    } catch (error) {
      log.error("Error in unfollowUser", {
        error,
        followerId,
        followingId,
        entityId,
      });
      throw error;
    }
  }

  static async getFollowers({
    db,
    userId,
    entityId,
    limit = 10,
    offset = 0,
    search = "",
  }: {
    db: any;
    userId: string;
    entityId: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting followers", {
        userId,
        entityId,
        limit,
        offset,
        search,
      });

      const searchCondition = search
        ? sql`(
            LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${user.firstName}, ' ', ${
              user.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`
        : sql`true`;

      const data = await db
        .select({
          id: userToEntity.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          cover: user.cover,
          designation: aboutUser.headline,
          followedAt: userFollows.createdAt,
          isOnline:
            sql`CASE WHEN ${userToEntity.lastActive} + interval '10 minutes' > now() THEN true ELSE false END`.as(
              "is_online",
            ),
        })
        .from(userFollows)
        .innerJoin(userToEntity, eq(userFollows.followerId, userToEntity.id))
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
        .leftJoin(blockedUsers, this.getBlockedUsersCondition(userId))
        .where(
          and(
            eq(userFollows.followingId, userId),
            eq(userFollows.entityId, entityId),
            sql`${blockedUsers.id} IS NULL`,
            searchCondition,
          ),
        )
        .limit(limit + 1)
        .offset(offset);

      const { data: results } = this.applyPagination(data, limit, offset);
      const enrichedResults = await this.enrichWithMutualFriends({
        db,
        results,
        currentUserId: userId,
        entityId,
      });

      log.info("Followers retrieved", {
        userId,
        count: enrichedResults.length,
      });

      return {
        data: enrichedResults,
        pagination: {
          total: null,
          limit,
          offset,
          hasMore: data.length > limit,
        },
      };
    } catch (error) {
      log.error("Error in getFollowers", { error, userId, entityId });
      throw error;
    }
  }

  static async getFollowing({
    db,
    userId,
    entityId,
    limit = 10,
    offset = 0,
    search = "",
  }: {
    db: any;
    userId: string;
    entityId: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting following", {
        userId,
        entityId,
        limit,
        offset,
        search,
      });

      const searchCondition = search
        ? sql`(
            LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${user.firstName}, ' ', ${
              user.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`
        : sql`true`;

      const data = await db
        .select({
          id: userToEntity.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          cover: user.cover,
          designation: aboutUser.headline,
          followedAt: userFollows.createdAt,
          isOnline:
            sql`CASE WHEN ${userToEntity.lastActive} + interval '10 minutes' > now() THEN true ELSE false END`.as(
              "is_online",
            ),
        })
        .from(userFollows)
        .innerJoin(userToEntity, eq(userFollows.followingId, userToEntity.id))
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
        .leftJoin(blockedUsers, this.getBlockedUsersCondition(userId))
        .where(
          and(
            eq(userFollows.followerId, userId),
            eq(userFollows.entityId, entityId),
            sql`${blockedUsers.id} IS NULL`,
            searchCondition,
          ),
        )
        .limit(limit + 1)
        .offset(offset);

      const { data: results } = this.applyPagination(data, limit, offset);
      const enrichedResults = await this.enrichWithMutualFriends({
        db,
        results,
        currentUserId: userId,
        entityId,
      });

      log.info("Following retrieved", {
        userId,
        count: enrichedResults.length,
      });

      return {
        data: enrichedResults,
        pagination: {
          total: null,
          limit,
          offset,
          hasMore: data.length > limit,
        },
      };
    } catch (error) {
      log.error("Error in getFollowing", { error, userId, entityId });
      throw error;
    }
  }

  static async getFollowStats({
    db,
    userId,
    entityId,
  }: {
    db: any;
    userId: string;
    entityId: string;
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting follow stats", { userId, entityId });

      const [followersCount] = await db
        .select({
          count: sql<number>`count(*)`.as("count"),
        })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followingId, userId),
            eq(userFollows.entityId, entityId),
          ),
        );

      const [followingCount] = await db
        .select({
          count: sql<number>`count(*)`.as("count"),
        })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, userId),
            eq(userFollows.entityId, entityId),
          ),
        );

      const stats = {
        followers: Number(followersCount?.count || 0),
        following: Number(followingCount?.count || 0),
      };

      log.info("Follow stats retrieved", { userId, ...stats });
      return stats;
    } catch (error) {
      log.error("Error in getFollowStats", { error, userId, entityId });
      throw error;
    }
  }

  static async checkFollowStatus({
    db,
    followerId,
    followingId,
    entityId,
  }: {
    db: any;
    followerId: string;
    followingId: string;
    entityId: string;
  }) {
    try {
      if (!followerId || !followingId || !entityId) {
        throw new GraphQLError(
          "Follower ID, Following ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      log.debug("Checking follow status", {
        followerId,
        followingId,
        entityId,
      });

      const [follow] = await db
        .select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, followerId),
            eq(userFollows.followingId, followingId),
            eq(userFollows.entityId, entityId),
          ),
        )
        .limit(1);

      const result = {
        isFollowing: !!follow,
      };

      log.info("Follow status checked", {
        followerId,
        followingId,
        isFollowing: result.isFollowing,
      });
      return result;
    } catch (error) {
      log.error("Error in checkFollowStatus", {
        error,
        followerId,
        followingId,
        entityId,
      });
      throw error;
    }
  }
}
