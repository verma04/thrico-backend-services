import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, ne, or, sql, desc, lt, count } from "drizzle-orm";
import {
  aboutUser,
  connections,
  connectionsRequest,
  user,
  userToEntity,
  userProfile,
  userReports,
  blockedUsers,
  userFollows,
  closeFriends,
  AppDatabase,
  incrementUnreadCount,
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
    cursor,
    limit = 10,
    offset,
    search = "",
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    limit?: number;
    cursor?: string | null;
    offset?: number;
    search?: string;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const calculatedOffset = cursor
        ? parseInt(
            Buffer.from(cursor, "base64").toString("ascii").split(":")[1],
          )
        : offset || 0;

      log.debug("Getting network (cursor)", {
        currentUserId,
        entityId,
        limit,
        offset: calculatedOffset,
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
            isCloseFriend: sql<boolean>`EXISTS (
              SELECT 1 FROM "closeFriends" cf
              WHERE cf.user_id = ${currentUserId}
              AND cf.friend_id = ${userToEntity.id}
              AND cf.entity_id = ${entityId}
            )`.as("is_close_friend"),
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
            ne(userStatus.status, "CONNECTED"),
            searchCondition,
          ),
        )
        .orderBy(sql`${userStatus.mutualFriendsCount} DESC`)
        .limit(limit + 1)
        .offset(calculatedOffset);

      const hasNextPage = data.length > limit;
      const nodes = hasNextPage ? data.slice(0, limit) : data;

      // Enrich each user with their number of connections
      const enrichedResults = await Promise.all(
        nodes.map(async (item: any) => {
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

      const edges = enrichedResults.map((node, index: number) => ({
        cursor: Buffer.from(`offset:${calculatedOffset + index + 1}`).toString(
          "base64",
        ),
        node,
      }));

      // Get count using simple count query (approximation or reused logic)
      // Reusing logic for accuracy
      const countQuery = db.$with("user_status_count").as(
        db
          .selectDistinct({
            id: userToEntity.id,
            entityId: userToEntity.entityId,
            firstName: user.firstName,
            lastName: user.lastName,
            status: this.getConnectionStatusQuery(currentUserId),
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
          .where(sql`${blockedUsers.id} IS NULL`),
      );

      const [totalCountResult] = await db
        .with(countQuery)
        .select({ value: sql<number>`count(*)` })
        .from(countQuery)
        .where(
          and(
            ne(countQuery.id, currentUserId),
            eq(countQuery.entityId, entityId),
            ne(countQuery.status, "CONNECTED"),
            search
              ? sql`(
            LOWER(${countQuery.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${countQuery.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${countQuery.firstName}, ' ', ${
              countQuery.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`
              : sql`true`,
          ),
        );

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: totalCountResult?.value || 0,
      };
    } catch (error) {
      log.error("Error in getNetwork", { error, currentUserId, entityId });
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

      const [closeFriendStatus] = await db
        .select()
        .from(closeFriends)
        .where(
          and(
            eq(closeFriends.userId, currentUserId),
            eq(closeFriends.friendId, id),
            eq(closeFriends.entityId, entityId),
          ),
        )
        .limit(1);

      return {
        ...condition,
        status: query[0] ? query[0].status : "NO_CONNECTION",
        isFollowing: !!followStatus,
        isCloseFriend: !!closeFriendStatus,
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

      const [closeFriendStatus] = await db
        .select()
        .from(closeFriends)
        .where(
          and(
            eq(closeFriends.userId, currentUserId),
            eq(closeFriends.friendId, id),
            eq(closeFriends.entityId, entityId),
          ),
        )
        .limit(1);

      return {
        ...condition,
        status: query[0] ? query[0].status : "NO_CONNECTION",
        isFollowing: !!followStatus,
        isCloseFriend: !!closeFriendStatus,
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
        module: "NETWORK",
        type: "CONNECTION_REQUEST",
        isIncrementUnreadCount: false,
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
          image: senderRecord.user.avatar,
        },
      });

      await incrementUnreadCount("NETWORK", receiverRecord.userId, entity);

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
          module: "NETWORK",
          type: "CONNECTION_ACCEPTED",
          isIncrementUnreadCount: true,
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
            image: receiverRecord.user.avatar,
          },
        });
        await incrementUnreadCount("NETWORK", senderRecord.userId, entity);
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

        await tx
          .delete(closeFriends)
          .where(
            and(
              eq(closeFriends.entityId, entity),
              or(
                and(
                  eq(closeFriends.userId, currentUserId),
                  eq(closeFriends.friendId, targetUserId),
                ),
                and(
                  eq(closeFriends.userId, targetUserId),
                  eq(closeFriends.friendId, currentUserId),
                ),
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
          .delete(closeFriends)
          .where(
            and(
              eq(closeFriends.entityId, entityId),
              or(
                and(
                  eq(closeFriends.userId, blockerId),
                  eq(closeFriends.friendId, blockedUserId),
                ),
                and(
                  eq(closeFriends.userId, blockedUserId),
                  eq(closeFriends.friendId, blockerId),
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
    cursor,
    offset,
    search = "",
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    limit?: number;
    cursor?: string | null;
    offset?: number;
    search?: string;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const calculatedOffset = cursor
        ? parseInt(
            Buffer.from(cursor, "base64").toString("ascii").split(":")[1],
          )
        : offset || 0;

      log.debug("Getting blocked users (cursor)", {
        currentUserId,
        entityId,
        limit,
        offset: calculatedOffset,
        search,
      });

      const whereConditions = [
        eq(blockedUsers.blockerId, currentUserId),
        eq(blockedUsers.entityId, entityId),
      ];

      // Add search term condition
      if (search) {
        whereConditions.push(
          sql`(
            LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${user.firstName}, ' ', ${
              user.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`,
        );
      }

      // Add cursor condition
      if (cursor) {
        whereConditions.push(lt(blockedUsers.createdAt, new Date(cursor)));
      }

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
        .where(and(...whereConditions))
        .orderBy(desc(blockedUsers.createdAt))
        .limit(limit + 1)
        .offset(calculatedOffset);

      const hasNextPage = data.length > limit;
      const nodes = hasNextPage ? data.slice(0, limit) : data;

      log.info("Blocked users retrieved", {
        currentUserId,
        count: nodes.length,
      });

      const edges = nodes.map((node: any, index: number) => ({
        cursor: Buffer.from(`offset:${calculatedOffset + index + 1}`).toString(
          "base64",
        ),
        node,
      }));

      // Get total count
      const totalWhere = [
        eq(blockedUsers.blockerId, currentUserId),
        eq(blockedUsers.entityId, entityId),
      ];

      if (search) {
        totalWhere.push(
          sql`(
              LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
              LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
              LOWER(CONCAT(${user.firstName}, ' ', ${
                user.lastName
              })) LIKE LOWER(${`%${search}%`})
            )`,
        );
      }

      const [totalCountResult] = await db
        .select({ value: count(blockedUsers.id) })
        .from(blockedUsers)
        .innerJoin(
          userToEntity,
          eq(blockedUsers.blockedUserId, userToEntity.id),
        )
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .where(and(...totalWhere));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: totalCountResult?.value || 0,
      };
    } catch (error) {
      log.error("Error in getBlockedUsers", { error, currentUserId, entityId });
      throw error;
    }
  }

  static async getMemberBirthdays({
    db,
    entityId,
    limit = 10,
    cursor,
    filter,
    currentUserId,
  }: {
    db: any;
    entityId: string;
    limit?: number;
    cursor?: string | null;
    filter: "TODAY" | "UPCOMING" | "THIS_MONTH" | "PAST";
    currentUserId: string;
  }) {
    try {
      const offset = cursor
        ? parseInt(
            Buffer.from(cursor, "base64").toString("ascii").split(":")[1],
          )
        : 0;

      log.debug("Getting member birthdays", {
        entityId,
        limit,
        offset,
        filter,
      });

      const dobDate = sql`to_date(${userProfile.DOB}, 'YYYY-MM-DD')`;
      const currentMonth = sql`extract(month from now())`;
      const currentDay = sql`extract(day from now())`;
      const dobMonth = sql`extract(month from ${dobDate})`;
      const dobDay = sql`extract(day from ${dobDate})`;

      const whereConditions = [
        eq(userToEntity.entityId, entityId),
        eq(userToEntity.status, "APPROVED"),
        sql`${userProfile.DOB} IS NOT NULL`,
        sql`${userProfile.DOB} != ''`,
        ne(user.id, currentUserId), // Exclude self
      ];

      // Logic for filters
      if (filter === "TODAY") {
        whereConditions.push(
          and(eq(dobMonth, currentMonth), eq(dobDay, currentDay)) as any,
        );
      } else if (filter === "THIS_MONTH") {
        whereConditions.push(eq(dobMonth, currentMonth));
      } else if (filter === "UPCOMING") {
        whereConditions.push(
          or(
            sql`${dobMonth} > ${currentMonth}`,
            and(
              eq(dobMonth, currentMonth),
              sql`${dobDay} >= ${currentDay}`,
            ) as any,
          ) as any,
        );
      } else if (filter === "PAST") {
        whereConditions.push(
          or(
            sql`${dobMonth} < ${currentMonth}`,
            and(
              eq(dobMonth, currentMonth),
              sql`${dobDay} < ${currentDay}`,
            ) as any,
          ) as any,
        );
      }

      // Order by Logic
      let orderByClause: any[] = [];
      if (filter === "PAST") {
        orderByClause = [desc(dobMonth), desc(dobDay)];
      } else {
        orderByClause = [sql`${dobMonth} ASC`, sql`${dobDay} ASC`];
      }

      const data = await db
        .select({
          id: userToEntity.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          designation: aboutUser.headline,
          dob: userProfile.DOB,
          userId: user.id,
          isCloseFriend: sql<boolean>`EXISTS (
              SELECT 1 FROM "closeFriends" cf
              WHERE cf.user_id = ${currentUserId}
              AND cf.friend_id = ${userToEntity.id}
              AND cf.entity_id = ${entityId}
            )`.as("is_close_friend"),
          isOnline:
            sql`CASE WHEN ${userToEntity.lastActive} + interval '10 minutes' > now() THEN true ELSE false END`.as(
              "is_online",
            ),
        })
        .from(userToEntity)
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(userProfile, eq(user.id, userProfile.userId))
        .leftJoin(aboutUser, eq(user.id, aboutUser.userId))
        .where(and(...whereConditions))
        .orderBy(...orderByClause)
        .limit(limit + 1)
        .offset(offset);

      const hasNextPage = data.length > limit;
      const nodes = hasNextPage ? data.slice(0, limit) : data;

      const enrichedResults = await Promise.all(
        nodes.map(async (item: any) => {
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

          // Get connection status
          const statusQuery = await db
            .select({ status: connectionsRequest.connectionStatusEnum })
            .from(connectionsRequest)
            .where(
              and(
                eq(connectionsRequest.entity, entityId),
                or(
                  and(
                    eq(connectionsRequest.sender, currentUserId),
                    eq(connectionsRequest.receiver, item.id),
                  ),
                  and(
                    eq(connectionsRequest.sender, item.id),
                    eq(connectionsRequest.receiver, currentUserId),
                  ),
                ),
              ),
            )
            .limit(1);

          // Check if connected
          const isConnected = await db
            .select()
            .from(connections)
            .where(
              and(
                eq(connections.entity, entityId),
                eq(connections.connectionStatusEnum, "ACCEPTED"),
                or(
                  and(
                    eq(connections.user1, currentUserId),
                    eq(connections.user2, item.id),
                  ),
                  and(
                    eq(connections.user2, currentUserId),
                    eq(connections.user1, item.id),
                  ),
                ),
              ),
            )
            .limit(1);

          let status = "NO_CONNECTION";
          if (isConnected[0]) status = "CONNECTED";
          else if (statusQuery[0]) {
            if (statusQuery[0].status === "PENDING") {
              // Check who sent it. This simplifies logic.
              // Ideally we check sender/receiver.
              // Assuming if pending, return status from request.
              // But GraphQL enum has REQUEST_RECEIVED / REQUEST_SENT.
              // Re-query request with direction.
              const req = await db.query.userRequest.findFirst({
                where: (r: any, { or, and, eq }: any) =>
                  and(
                    eq(r.entity, entityId),
                    eq(r.connectionStatusEnum, "PENDING"),
                    or(
                      and(eq(r.sender, currentUserId), eq(r.receiver, item.id)),
                      and(eq(r.sender, item.id), eq(r.receiver, currentUserId)),
                    ),
                  ),
              });
              if (req) {
                status =
                  req.sender === currentUserId
                    ? "REQUEST_SENT"
                    : "REQUEST_RECEIVED";
              }
            }
          }

          return {
            ...item,
            mutualFriends: {
              count: mutualFriends.length,
              friends: mutualFriends,
            },
            numberOfConnections: Number(connectionsCount?.count || 0),
            status: status, // Simplified
          };
        }),
      );

      const edges = enrichedResults.map((node: any, index: number) => ({
        cursor: Buffer.from(`offset:${offset + index + 1}`).toString("base64"),
        node,
      }));

      // Get total count
      const [totalCountResult] = await db
        .select({ value: count(userToEntity.id) })
        .from(userToEntity)
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(userProfile, eq(user.id, userProfile.userId))
        .where(and(...whereConditions));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: totalCountResult?.value || 0,
      };
    } catch (error) {
      log.error("Error in getMemberBirthdays", { error, entityId });
      throw error;
    }
  }

  static async getMyConnections({
    db,
    currentUserId,
    entityId,
    limit = 10,
    cursor,
    offset,
    search = "",
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    cursor?: string | null;
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

      const calculatedOffset = cursor
        ? parseInt(
            Buffer.from(cursor, "base64").toString("ascii").split(":")[1],
          )
        : offset || 0;

      log.debug("Getting my connections (cursor)", {
        currentUserId,
        entityId,
        limit,
        offset: calculatedOffset,
        search,
      });

      const whereConditions = [
        eq(connections.entity, entityId),
        eq(connections.connectionStatusEnum, "ACCEPTED"),
        sql`${blockedUsers.id} IS NULL`,
      ];

      // Add search term condition
      if (search) {
        whereConditions.push(
          sql`(
            LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${user.firstName}, ' ', ${
              user.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`,
        );
      }

      // Add cursor condition
      if (cursor) {
        whereConditions.push(lt(connections.createdAt, new Date(cursor)));
      }

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
          isCloseFriend: sql<boolean>`EXISTS (
              SELECT 1 FROM "closeFriends" cf
              WHERE cf.user_id = ${currentUserId}
              AND cf.friend_id = ${userToEntity.id}
              AND cf.entity_id = ${entityId}
            )`.as("is_close_friend"),
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
        .where(and(...whereConditions))
        .orderBy(desc(connections.createdAt))
        .limit(limit + 1)
        .offset(calculatedOffset);

      const hasNextPage = data.length > limit;
      const nodes = hasNextPage ? data.slice(0, limit) : data;

      const enrichedResults = await Promise.all(
        nodes.map(async (item: any) => {
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

      const edges = nodes.map((node: any, index: number) => ({
        cursor: Buffer.from(`offset:${calculatedOffset + index + 1}`).toString(
          "base64",
        ),
        node,
      }));

      const totalWhere = [
        eq(connections.entity, entityId),
        eq(connections.connectionStatusEnum, "ACCEPTED"),
        sql`${blockedUsers.id} IS NULL`,
      ];
      if (search) {
        totalWhere.push(
          sql`(
              LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
              LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
              LOWER(CONCAT(${user.firstName}, ' ', ${
                user.lastName
              })) LIKE LOWER(${`%${search}%`})
            )`,
        );
      }

      const [trueTotalCount] = await db
        .select({ value: count(connections.id) })
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
        .leftJoin(blockedUsers, this.getBlockedUsersCondition(currentUserId))
        .where(and(...totalWhere));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: trueTotalCount?.value || 0,
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
    cursor,
    offset,
    search = "",
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    cursor?: string | null;
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

      const calculatedOffset = cursor
        ? parseInt(
            Buffer.from(cursor, "base64").toString("ascii").split(":")[1],
          )
        : offset || 0;

      log.debug("Getting connection requests (cursor)", {
        currentUserId,
        entityId,
        limit,
        offset: calculatedOffset,
        search,
      });

      const whereConditions = [
        eq(connectionsRequest.receiver, currentUserId),
        eq(connectionsRequest.connectionStatusEnum, "PENDING"),
        eq(connectionsRequest.entity, entityId),
        sql`${blockedUsers.id} IS NULL`,
      ];

      if (search) {
        whereConditions.push(
          sql`(
            LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${user.firstName}, ' ', ${
              user.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`,
        );
      }

      if (cursor) {
        whereConditions.push(
          lt(connectionsRequest.createdAt, new Date(cursor)),
        );
      }

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
          isCloseFriend: sql<boolean>`EXISTS (
              SELECT 1 FROM "closeFriends" cf
              WHERE cf.user_id = ${currentUserId}
              AND cf.friend_id = ${connectionsRequest.sender}
              AND cf.entity_id = ${entityId}
            )`.as("is_close_friend"),
        })
        .from(connectionsRequest)
        .innerJoin(userToEntity, eq(connectionsRequest.sender, userToEntity.id))
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
        .leftJoin(blockedUsers, this.getBlockedUsersCondition(currentUserId))
        .where(and(...whereConditions))
        .orderBy(desc(connectionsRequest.createdAt))
        .limit(limit + 1)
        .offset(calculatedOffset);

      const hasNextPage = data.length > limit;
      const nodes = hasNextPage ? data.slice(0, limit) : data;

      const enrichedResults = await Promise.all(
        nodes.map(async (item: any) => {
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

      const edges = nodes.map((node: any, index: number) => ({
        cursor: Buffer.from(`offset:${calculatedOffset + index + 1}`).toString(
          "base64",
        ),
        node,
      }));

      // Get total count
      const totalWhere = [
        eq(connectionsRequest.receiver, currentUserId),
        eq(connectionsRequest.connectionStatusEnum, "PENDING"),
        eq(connectionsRequest.entity, entityId),
        sql`${blockedUsers.id} IS NULL`,
      ];

      if (search) {
        totalWhere.push(
          sql`(
              LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
              LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
              LOWER(CONCAT(${user.firstName}, ' ', ${
                user.lastName
              })) LIKE LOWER(${`%${search}%`})
            )`,
        );
      }

      const [totalCountResult] = await db
        .select({ value: count(connectionsRequest.id) })
        .from(connectionsRequest)
        .innerJoin(userToEntity, eq(connectionsRequest.sender, userToEntity.id))
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .leftJoin(blockedUsers, this.getBlockedUsersCondition(currentUserId))
        .where(and(...totalWhere));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: totalCountResult?.value || 0,
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

  public static async addToCloseFriends({
    db,
    userId,
    friendId,
    entityId,
  }: {
    db: any;
    userId: string;
    friendId: string;
    entityId: string;
  }) {
    try {
      if (!userId || !friendId || !entityId) {
        throw new GraphQLError(
          "User ID, Friend ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      const [user1Record, user2Record] = await Promise.all([
        db.query.userToEntity.findFirst({
          where: eq(userToEntity.id, userId),
          with: { user: true },
        }),
        db.query.userToEntity.findFirst({
          where: eq(userToEntity.id, friendId),
        }),
      ]);

      if (!user1Record || !user2Record) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      await db.insert(closeFriends).values({
        userId: userId,
        friendId: friendId,
        entityId: entityId,
      });

      log.info("Added to close friends", { userId, friendId, entityId });
      return { success: true, message: "Added to close friends" };
    } catch (error) {
      log.error("Error in addToCloseFriends", {
        error,
        userId,
        friendId,
        entityId,
      });
      throw error;
    }
  }

  public static async removeFromCloseFriends({
    db,
    userId,
    friendId,
    entityId,
  }: {
    db: any;
    userId: string;
    friendId: string;
    entityId: string;
  }) {
    try {
      if (!userId || !friendId || !entityId) {
        throw new GraphQLError(
          "User ID, Friend ID, and Entity ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          },
        );
      }

      const [user1Record, user2Record] = await Promise.all([
        db.query.userToEntity.findFirst({
          where: eq(userToEntity.id, userId),
        }),
        db.query.userToEntity.findFirst({
          where: eq(userToEntity.id, friendId),
        }),
      ]);

      if (!user1Record || !user2Record) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const user1 = user1Record.userId;
      const user2 = user2Record.userId;

      await db
        .delete(closeFriends)
        .where(
          and(
            eq(closeFriends.userId, userId),
            eq(closeFriends.friendId, friendId),
            eq(closeFriends.entityId, entityId),
          ),
        );

      log.info("Removed from close friends", { userId, friendId, entityId });
      return { success: true, message: "Removed from close friends" };
    } catch (error) {
      log.error("Error in removeFromCloseFriends", {
        error,
        userId,
        friendId,
        entityId,
      });
      throw error;
    }
  }

  public static async getCloseFriends({
    db,
    currentUserId,
    entityId,
    cursor,
    limit = 10,
    search = "",
  }: {
    db: any;
    currentUserId: string;
    entityId: string;
    limit?: number;
    cursor?: string | null;
    search?: string;
  }) {
    try {
      if (!currentUserId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const userRecord = await db.query.userToEntity.findFirst({
        where: eq(userToEntity.id, currentUserId),
      });

      if (!userRecord) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const globalUserId = userRecord.userId;

      const calculatedOffset = cursor
        ? parseInt(
            Buffer.from(cursor, "base64").toString("ascii").split(":")[1],
          )
        : 0;

      const closeFriendsQuery = db.$with("close_friends_cte").as(
        db
          .select({
            id: userToEntity.id,
            entityId: userToEntity.entityId,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            cover: user.cover,
            designation: aboutUser.headline,
            isOnline:
              sql`CASE WHEN ${userToEntity.lastActive} + interval '10 minutes' > now() THEN true ELSE false END`.as(
                "is_online",
              ),
            isCloseFriend: true,
          })
          .from(closeFriends)
          .innerJoin(
            userToEntity,
            and(
              eq(userToEntity.id, closeFriends.friendId),
              eq(userToEntity.entityId, entityId),
            ),
          )
          .innerJoin(user, eq(userToEntity.userId, user.id))
          .innerJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
          .where(
            and(
              eq(closeFriends.userId, currentUserId),
              eq(closeFriends.entityId, entityId),
            ),
          ),
      );

      const searchCondition = search
        ? sql`(
            LOWER(${closeFriendsQuery.firstName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(${closeFriendsQuery.lastName}) LIKE LOWER(${`%${search}%`}) OR
            LOWER(CONCAT(${closeFriendsQuery.firstName}, ' ', ${
              closeFriendsQuery.lastName
            })) LIKE LOWER(${`%${search}%`})
          )`
        : sql`true`;

      const data = await db
        .with(closeFriendsQuery)
        .select()
        .from(closeFriendsQuery)
        .where(searchCondition)
        .limit(limit + 1)
        .offset(calculatedOffset);

      const hasNextPage = data.length > limit;
      const nodes = hasNextPage ? data.slice(0, limit) : data;

      const edges = nodes.map((node: any, index: number) => ({
        cursor: Buffer.from(`offset:${calculatedOffset + index + 1}`).toString(
          "base64",
        ),
        node,
      }));

      const [totalCountResult] = await db
        .with(closeFriendsQuery)
        .select({ value: count() })
        .from(closeFriendsQuery)
        .where(searchCondition);

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: totalCountResult?.value || 0,
      };
    } catch (error) {
      log.error("Error in getCloseFriends", { error, currentUserId, entityId });
      throw error;
    }
  }
}
