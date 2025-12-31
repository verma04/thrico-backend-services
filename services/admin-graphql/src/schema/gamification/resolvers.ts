// import { db } from "@/schema";
import {
  badges,
  pointRules,
  ranks,
  //   user,
  //   userActions,
  userBadges,
  userPointsHistory,
  userRankHistory,
  gamificationUser,
} from "@thrico/database";
// import { equal } from "assert";
import { eq, desc, and, gte, count, sql } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";

export const gamificationResolvers = {
  Query: {
    // Point Rules Queries

    async pointRules(_: any, {}: any, context: any) {
      const { db, entity } = await checkAuth(context);
      const result = await db
        .select()
        .from(pointRules)
        .where(eq(pointRules.entityId, entity));

      console.log("Point Rules Result:", result);
      return result || [];
    },

    // Badges Queries
    async badges(_: any, { filter, pagination, userId }: any, context: any) {
      const { db } = await checkAuth(context);
      const badgeQuery = db.query.badges.findMany({
        limit: pagination?.limit || 20,
        offset: pagination?.offset || 0,
        where: (badges: any, { eq, and }: any) => {
          const conditions = [];
          if (filter?.type) conditions.push(eq(badges.type, filter.type));
          if (filter?.module) conditions.push(eq(badges.module, filter.module));
          if (filter?.isActive !== undefined)
            conditions.push(eq(badges.isActive, filter.isActive));
          return conditions.length > 0 ? and(...conditions) : undefined;
        },
        orderBy: (badges: any, { desc }: any) => [desc(badges.createdAt)],
      });

      const badgeResults = await badgeQuery;

      // If userId is provided, include user progress
      if (userId) {
        const userBadgeProgress = await db.query.userBadges.findMany({
          where: eq(userBadges.userId, userId),
        });

        const progressMap = new Map(
          userBadgeProgress.map((ub: any) => [ub.badgeId, ub])
        );

        return badgeResults.map((badge: any) => ({
          ...badge,
          userProgress: progressMap.get(badge.id) || null,
        }));
      }

      return badgeResults;
    },

    async badge(_: any, { id, userId }: any, context: any) {
      const { db } = await checkAuth(context);
      const badge = await db.query.badges.findFirst({
        where: eq(badges.id, id),
      });

      if (!badge) return null;

      if (userId) {
        const userProgress = await db.query.userBadges.findFirst({
          where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, id)),
        });

        return {
          ...badge,
          userProgress: userProgress || null,
        };
      }

      return badge;
    },

    async userBadges(_: any, { userId, filter }: any, context: any) {
      const { db } = await checkAuth(context);
      const userBadgeQuery = db.query.userBadges.findMany({
        where: (userBadges: any, { eq, and }: any) => {
          const conditions = [eq(userBadges.userId, userId)];
          if (filter?.isCompleted !== undefined) {
            conditions.push(eq(userBadges.isCompleted, filter.isCompleted));
          }
          return and(...conditions);
        },
        with: {
          badge: true,
        },
        orderBy: (userBadges: any, { desc }: any) => [
          desc(userBadges.earnedAt),
        ],
      });

      const results = await userBadgeQuery;
      return results.map((ub: any) => ({
        ...ub.badge,
        userProgress: {
          id: ub.id,
          progress: ub.progress,
          isCompleted: ub.isCompleted,
          earnedAt: ub.earnedAt,
        },
      }));
    },

    // Ranks Queries
    async ranks(_: any, { filter, pagination }: any, context: any) {
      const { db } = await checkAuth(context);
      const conditions = [];
      if (filter) {
        if (filter.type) conditions.push(eq(ranks.type, filter.type));
        if (filter.isActive !== undefined)
          conditions.push(eq(ranks.isActive, filter.isActive));
      }

      return await db.query.ranks.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (ranks: any, { asc }: any) => [asc(ranks.order)],
        limit: pagination?.limit,
        offset: pagination?.offset,
      });
    },

    async rank(_: any, { id }: any, context: any) {
      const { db } = await checkAuth(context);
      const result = await db
        .select()
        .from(ranks)
        .where(eq(ranks.id, id))
        .limit(1);
      return result[0] || null;
    },

    // User Gamification Queries
    async userGamification(_: any, { userId }: any, context: any) {
      const { db } = await checkAuth(context);
      return await db.query.gamificationUser.findFirst({
        where: eq(gamificationUser.id, userId),
        with: {
          currentRank: true,
          pointsHistory: {
            limit: 10,
            orderBy: desc(userPointsHistory.createdAt),
            with: {
              pointRule: true,
            },
          },
          badges: {
            with: {
              badge: true,
            },
          },
          rankHistory: {
            with: {
              fromRank: true,
              toRank: true,
            },
            orderBy: desc(userRankHistory.achievedAt),
          },
        },
      });
    },

    async userPointsHistory(_: any, { userId, pagination }: any, context: any) {
      const { db } = await checkAuth(context);
      return await db.query.userPointsHistory.findMany({
        where: eq(userPointsHistory.userId, userId),
        limit: pagination?.limit || 20,
        offset: pagination?.offset || 0,
        orderBy: desc(userPointsHistory.createdAt),
        with: {
          pointRule: true,
        },
      });
    },

    async userRankHistory(_: any, { userId }: any, context: any) {
      const { db } = await checkAuth(context);
      return await db.query.userRankHistory.findMany({
        where: eq(userRankHistory.userId, userId),
        orderBy: desc(userRankHistory.achievedAt),
        with: {
          fromRank: true,
          toRank: true,
        },
      });
    },

    // Leaderboard Query
    async leaderboard(_: any, { pagination, userId }: any, context: any) {
      const { db } = await checkAuth(context);
      const limit = pagination?.limit || 20;
      const offset = pagination?.offset || 0;

      // Get topgamificationUser
      const topUsers = await db.query.gamificationUser.findMany({
        limit,
        offset,
        orderBy: desc(gamificationUser.totalPoints),
        with: {
          currentRank: true,
          badges: {
            where: eq(userBadges.isCompleted, true),
          },
        },
      });

      // Get total user count
      const totalUsersResult = await db
        .select({ count: count() })
        .from(gamificationUser);
      const totalUsers = totalUsersResult[0].count;

      // Get user position if userId provided
      let userPosition = null;
      if (userId) {
        const userRankResult = await db
          .select({
            rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${gamificationUser.totalPoints} DESC)`,
          })
          .from(gamificationUser)
          .where(eq(gamificationUser.id, userId))
          .limit(1);

        userPosition = userRankResult[0]?.rank || null;
      }

      const entries = topUsers.map((user: any, index: number) => ({
        user,
        rank: offset + index + 1,
        totalPoints: user.totalPoints,
        badgesCount: Array.isArray(user.badges) ? user.badges.length : 0,
        currentRank: user.currentRank,
      }));

      return {
        entries,
        totalUsers,
        userPosition,
      };
    },

    async gamificationStats(_: any, __: any, context: any) {
      // Stub for stats, assuming simple counts
      const { db } = await checkAuth(context);
      // Implement actual stats logic if needed
      return {
        totalUsers: 0,
        totalPointsAwarded: 0,
        totalBadgesEarned: 0,
        activePointRules: 0,
        activeBadges: 0,
        activeRanks: 0,
        topRank: null,
        mostPopularBadge: null,
      };
    },
  },

  Mutation: {
    // async userCount(parent: any) {
    //   const result = await db
    //     .select({ count: count() })
    //     .from(gamificationUser)
    //     .where(eq(gamificationUser.currentRankId, parent.id));
    //   return result[0].count;
    // },
    // Point Rules Mutations
    async createPointRule(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const existingRule = await db
          .select()
          .from(pointRules)
          .where(
            and(
              eq(pointRules.module, input.module),
              eq(pointRules.action, input.action),
              eq(pointRules.trigger, input.trigger),
              eq(pointRules.entityId, entity)
            )
          );

        if (existingRule.length > 0) {
          throw new GraphQLError(
            "Point rule already exists for this module, action, trigger, and entity.",
            {
              extensions: {
                code: 400,
                http: { status: 400 },
              },
            }
          );
        }
        console.log(input);
        const [newPointRule] = await db
          .insert(pointRules)
          .values({ ...input, entityId: entity })
          .returning();
        return newPointRule;
      } catch (error) {
        console.log("Error creating point rule:", error);
        throw error;
      }
    },

    async updatePointRule(_: any, { input }: any, context: any) {
      const { db, entity } = await checkAuth(context);
      const [updatedPointRule] = await db
        .update(pointRules)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(pointRules.id, input.id))
        .returning();
      return updatedPointRule;
    },

    async deletePointRule(_: any, { id }: any, context: any) {
      const { db } = await checkAuth(context);
      await db
        .update(pointRules)
        .set({ isActive: false })
        .where(eq(pointRules.id, id));
      return true;
    },

    // Badges Mutations
    async createBadge(_: any, { input }: any, context: any) {
      const { db, entity } = await checkAuth(context);
      const [newBadge] = await db.insert(badges).values(input).returning();
      return newBadge;
    },

    async updateBadge(_: any, { id, input }: any, context: any) {
      const { db, entity } = await checkAuth(context);
      const [updatedBadge] = await db
        .update(badges)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(badges.id, id))
        .returning();
      return updatedBadge;
    },

    async deleteBadge(_: any, { id }: any, context: any) {
      const { db } = await checkAuth(context);
      await db.update(badges).set({ isActive: false }).where(eq(badges.id, id));
      return true;
    },

    // Ranks Mutations
    async createRank(_: any, { input }: any, context: any) {
      const { db, entity } = await checkAuth(context);
      const [newRank] = await db
        .insert(ranks)
        .values({ ...input, entityId: entity })
        .returning();
      return newRank;
    },

    async updateRank(_: any, { id, input }: any, context: any) {
      const { db } = await checkAuth(context);
      const [updatedRank] = await db
        .update(ranks)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(ranks.id, id))
        .returning();
      return updatedRank;
    },

    async deleteRank(_: any, { id }: any, context: any) {
      const { db } = await checkAuth(context);
      await db.update(ranks).set({ isActive: false }).where(eq(ranks.id, id));
      return true;
    },

    // Manual Gamification Actions
    async awardPoints(
      _: any,
      { userId, pointRuleId, metadata }: any,
      context: any
    ) {
      const { db } = await checkAuth(context);
      // Return the created points history entry
      const historyEntry = await db.query.userPointsHistory.findFirst({
        where: and(
          eq(userPointsHistory.userId, userId),
          eq(userPointsHistory.pointRuleId, pointRuleId)
        ),
        orderBy: desc(userPointsHistory.createdAt),
        with: {
          pointRule: true,
        },
      });

      return historyEntry;
    },

    async awardBadge(_: any, { userId, badgeId }: any, context: any) {
      const { db } = await checkAuth(context);
      // Mark badge as completed
      const [userBadge] = await db
        .insert(userBadges)
        .values({
          userId: userId,
          badgeId: badgeId,
          isCompleted: true,
          progress: 100, // Assuming 100% completion
        })
        .onConflictDoUpdate({
          target: [userBadges.userId, userBadges.badgeId],
          set: {
            isCompleted: true,
            earnedAt: new Date(),
          },
        })
        .returning();

      return userBadge;
    },

    async promoteUser(_: any, { userId, rankId }: any, context: any) {
      const { db } = await checkAuth(context);
      const user = await db.query.gamificationUser.findFirst({
        where: eq(gamificationUser.id, userId),
      });

      if (!user) throw new Error("User not found");

      // Update user rank
      await db
        .update(gamificationUser)
        .set({ currentRankId: rankId })
        .where(eq(gamificationUser.id, userId));

      // Create rank history entry
      const [rankHistory] = await db
        .insert(userRankHistory)
        .values({
          userId: String(userId),
          fromRankId: user.currentRankId ? String(user.currentRankId) : null,
          toRankId: String(rankId),
        })
        .returning();

      // Return with relations
      return await db.query.userRankHistory.findFirst({
        where: eq(userRankHistory.id, rankHistory.id),
        with: {
          fromRank: true,
          toRank: true,
        },
      });
    },
  },

  // Field Resolvers
};
