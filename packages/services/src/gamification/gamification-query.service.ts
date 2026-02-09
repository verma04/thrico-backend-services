import {
  gamificationUser,
  pointRules,
  userPointsHistory,
  userBadges,
  badges,
  ranks,
  user,
} from "@thrico/database";
import { and, eq, desc, sql, gte, lt } from "drizzle-orm";
import { log } from "@thrico/logging";

export class GamificationQueryService {
  constructor(private db: any) {}

  /**
   * Fetches the user's total points and current rank details
   */
  async getUserGamificationProfile({
    userId,
    entityId,
    db = this.db,
  }: {
    userId: string;
    entityId: string;
    db?: any;
  }) {
    try {
      const [user] = await db
        .select({
          id: gamificationUser.id,
          totalPoints: gamificationUser.totalPoints,
          currentRankId: gamificationUser.currentRankId,
          user: gamificationUser.user,
          entityId: gamificationUser.entityId,
        })
        .from(gamificationUser)
        .where(
          and(
            eq(gamificationUser.user, userId),
            eq(gamificationUser.entityId, entityId),
          ),
        );

      if (!user) {
        return null;
      }

      let currentRank = null;
      if (user.currentRankId) {
        [currentRank] = await db
          .select()
          .from(ranks)
          .where(eq(ranks.id, user.currentRankId));
      }

      return {
        ...user,
        currentRank,
      };
    } catch (error) {
      log.error("Error in getUserGamificationProfile", {
        error,
        userId,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Fetches the user's total points, current rank, and total badges count by userId
   */
  async getGamificationStatsByUserId({
    userId,
    entityId,
    db = this.db,
  }: {
    userId: string;
    entityId: string;
    db?: any;
  }) {
    try {
      const profile = await this.getUserGamificationProfile({
        userId,
        entityId,
        db,
      });

      if (!profile) {
        return null;
      }

      // 1. Calculate global rank within entity
      const [rankRes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(gamificationUser)
        .where(
          and(
            eq(gamificationUser.entityId, entityId),
            sql`${gamificationUser.totalPoints} > ${profile.totalPoints}`,
          ),
        );
      const rank = Number(rankRes?.count || 0) + 1;

      // 2. Count total earned badges
      const [badgesCountRes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userBadges)
        .where(
          and(
            eq(userBadges.userId, profile.id),
            eq(userBadges.isCompleted, true),
          ),
        );
      const totalBadges = Number(badgesCountRes?.count || 0);

      return {
        ...profile,
        rank,
        totalBadges,
      };
    } catch (error) {
      log.error("Error in getGamificationStatsByUserId", {
        error,
        userId,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Fetches a list of badges earned by the user with pagination
   */
  async getUserEarnedBadges({
    userId,
    entityId,
    limit = 20,
    cursor,
    db = this.db,
  }: {
    userId: string;
    entityId: string;
    limit?: number;
    cursor?: string;
    db?: any;
  }) {
    try {
      // First get the gamification user ID
      const [user] = await db
        .select({ id: gamificationUser.id })
        .from(gamificationUser)
        .where(
          and(
            eq(gamificationUser.user, userId),
            eq(gamificationUser.entityId, entityId),
          ),
        );

      if (!user) {
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            limit,
            totalCount: 0,
          },
          totalCount: 0,
        };
      }

      const conditions = [
        eq(userBadges.userId, user.id),
        eq(userBadges.isCompleted, true),
      ];

      if (cursor) {
        conditions.push(lt(userBadges.earnedAt, new Date(cursor)));
      }

      const badgesQuery = db
        .select({
          id: userBadges.id,
          earnedAt: userBadges.earnedAt,
          progress: userBadges.progress,
          isCompleted: userBadges.isCompleted,
          badge: {
            id: badges.id,
            name: badges.name,
            type: badges.type,
            icon: badges.icon,
            description: badges.description,
          },
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(and(...conditions))
        .orderBy(desc(userBadges.earnedAt))
        .limit(limit + 1);

      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(userBadges)
        .where(
          and(eq(userBadges.userId, user.id), eq(userBadges.isCompleted, true)),
        );

      const [data, [countResult]] = await Promise.all([
        badgesQuery,
        countQuery,
      ]);

      const hasMore = data.length > limit;
      const edges = hasMore ? data.slice(0, limit) : data;
      const totalCount = Number(countResult?.count || 0);

      return {
        edges: edges.map((node: any) => ({
          cursor: node.earnedAt.toISOString(),
          node,
        })),
        pageInfo: {
          hasNextPage: hasMore,
          hasPreviousPage: !!cursor, // Simplified check
          limit,
          totalCount,
        },
        totalCount,
      };
    } catch (error) {
      log.error("Error in getUserEarnedBadges", { error, userId, entityId });
      throw error;
    }
  }

  /**
   * Fetches the user's points history with descriptions from point rules with pagination
   */
  async getUserPointsHistory({
    userId,
    entityId,
    limit = 20,
    cursor,
    db = this.db,
  }: {
    userId: string;
    entityId: string;
    limit?: number;
    cursor?: string;
    db?: any;
  }) {
    try {
      const [user] = await db
        .select({ id: gamificationUser.id })
        .from(gamificationUser)
        .where(
          and(
            eq(gamificationUser.user, userId),
            eq(gamificationUser.entityId, entityId),
          ),
        );

      if (!user) {
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            limit,
            totalCount: 0,
          },
          totalCount: 0,
        };
      }

      const conditions = [eq(userPointsHistory.userId, user.id)];

      if (cursor) {
        conditions.push(lt(userPointsHistory.createdAt, new Date(cursor)));
      }

      const historyQuery = db
        .select({
          id: userPointsHistory.id,
          pointsEarned: userPointsHistory.pointsEarned,
          createdAt: userPointsHistory.createdAt,
          metadata: userPointsHistory.metadata,
          rule: {
            action: pointRules.action,
            description: pointRules.description,
          },
        })
        .from(userPointsHistory)
        .innerJoin(pointRules, eq(userPointsHistory.pointRuleId, pointRules.id))
        .where(and(...conditions))
        .orderBy(desc(userPointsHistory.createdAt))
        .limit(limit + 1);

      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(userPointsHistory)
        .where(eq(userPointsHistory.userId, user.id));

      const [data, [countResult]] = await Promise.all([
        historyQuery,
        countQuery,
      ]);

      const hasMore = data.length > limit;
      const edges = hasMore ? data.slice(0, limit) : data;
      const totalCount = Number(countResult?.count || 0);

      return {
        edges: edges.map((node: any) => ({
          cursor: node.createdAt.toISOString(),
          node,
        })),
        pageInfo: {
          hasNextPage: hasMore,
          hasPreviousPage: !!cursor,
          limit,
          totalCount,
        },
        totalCount,
      };
    } catch (error) {
      log.error("Error in getUserPointsHistory", { error, userId, entityId });
      throw error;
    }
  }

  /**
   * Fetches all available badges for a given entity
   */
  async getEntityBadges({
    entityId,
    db = this.db,
  }: {
    entityId: string;
    db?: any;
  }) {
    try {
      return await db
        .select()
        .from(badges)
        .where(and(eq(badges.entityId, entityId), eq(badges.isActive, true)))
        .orderBy(desc(badges.createdAt));
    } catch (error) {
      log.error("Error in getEntityBadges", { error, entityId });
      throw error;
    }
  }

  /**
   * Fetches a summary of the user's gamification status
   */
  async getUserGamificationSummary({
    userId,
    entityId,
    db = this.db,
  }: {
    userId: string;
    entityId: string;
    db?: any;
  }) {
    try {
      // 1. Get user total points
      const [user] = await db
        .select({
          id: gamificationUser.id,
          totalPoints: gamificationUser.totalPoints,
        })
        .from(gamificationUser)
        .where(
          and(
            eq(gamificationUser.user, userId),
            eq(gamificationUser.entityId, entityId),
          ),
        );

      if (!user) {
        return {
          totalPoints: 0,
          weekPoints: 0,
          monthPoints: 0,
          totalBadges: 0,
          totalRanks: 0,
          weeklyGrowth: 0,
        };
      }

      // 2. Total badges and ranks
      const totalBadgesRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(userBadges)
        .where(
          and(eq(userBadges.userId, user.id), eq(userBadges.isCompleted, true)),
        );
      const totalBadges = Number(totalBadgesRes[0]?.count || 0);

      const totalRanksRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(ranks)
        .where(and(eq(ranks.entityId, entityId), eq(ranks.isActive, true)));
      const totalRanks = Number(totalRanksRes[0]?.count || 0);

      // 3. Time-based points
      const now = new Date();

      // Start of current week (Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Start of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const weekPointsRes = await db
        .select({ sum: sql<number>`sum(${userPointsHistory.pointsEarned})` })
        .from(userPointsHistory)
        .where(
          and(
            eq(userPointsHistory.userId, user.id),
            gte(userPointsHistory.createdAt, startOfWeek),
          ),
        );
      const weekPoints = Number(weekPointsRes[0]?.sum || 0);

      const monthPointsRes = await db
        .select({ sum: sql<number>`sum(${userPointsHistory.pointsEarned})` })
        .from(userPointsHistory)
        .where(
          and(
            eq(userPointsHistory.userId, user.id),
            gte(userPointsHistory.createdAt, startOfMonth),
          ),
        );
      const monthPoints = Number(monthPointsRes[0]?.sum || 0);

      // 4. Weekly growth
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      const lastWeekPointsRes = await db
        .select({ sum: sql<number>`sum(${userPointsHistory.pointsEarned})` })
        .from(userPointsHistory)
        .where(
          and(
            eq(userPointsHistory.userId, user.id),
            gte(userPointsHistory.createdAt, startOfLastWeek),
            lt(userPointsHistory.createdAt, startOfWeek),
          ),
        );
      const lastWeekPoints = Number(lastWeekPointsRes[0]?.sum || 0);

      let weeklyGrowth = 0;
      if (lastWeekPoints > 0) {
        weeklyGrowth = ((weekPoints - lastWeekPoints) / lastWeekPoints) * 100;
      } else if (weekPoints > 0) {
        weeklyGrowth = 100;
      }

      return {
        totalPoints: user.totalPoints,
        weekPoints,
        monthPoints,
        totalBadges,
        totalRanks,
        weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
      };
    } catch (error) {
      log.error("Error in getUserGamificationSummary", {
        error,
        userId,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Fetches a unified activity log of points and badges for the entire entity
   */
  async getGamificationActivityLog({
    entityId,
    limit = 20,
    offset = 0,
    db = this.db,
  }: {
    entityId: string;
    limit?: number;
    offset?: number;
    db?: any;
  }) {
    try {
      // 1. Fetch Points History
      const pointsHistory = await db
        .select({
          id: userPointsHistory.id,
          type: sql<string>`'POINTS'`,
          points: userPointsHistory.pointsEarned,
          metadata: userPointsHistory.metadata,
          createdAt: userPointsHistory.createdAt,
          userId: gamificationUser.user,
          gamificationId: userPointsHistory.pointRuleId,
          ruleAction: pointRules.action,
          ruleDescription: pointRules.description,
        })
        .from(userPointsHistory)
        .innerJoin(
          gamificationUser,
          eq(userPointsHistory.userId, gamificationUser.id),
        )
        .innerJoin(pointRules, eq(userPointsHistory.pointRuleId, pointRules.id))
        .where(eq(gamificationUser.entityId, entityId))
        .orderBy(desc(userPointsHistory.createdAt))
        .limit(limit)
        .offset(offset);

      // 2. Fetch Badges Earned
      const badgesEarned = await db
        .select({
          id: userBadges.id,
          type: sql<string>`'BADGE'`,
          points: sql<number>`0`,
          metadata: sql<any>`null`,
          createdAt: userBadges.earnedAt,
          userId: gamificationUser.user,
          gamificationId: userBadges.badgeId,
          badgeName: badges.name,
          badgeDescription: badges.description,
          badgeIcon: badges.icon,
        })
        .from(userBadges)
        .innerJoin(gamificationUser, eq(userBadges.userId, gamificationUser.id))
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(
          and(
            eq(gamificationUser.entityId, entityId),
            eq(userBadges.isCompleted, true),
          ),
        )
        .orderBy(desc(userBadges.earnedAt))
        .limit(limit)
        .offset(offset);

      // 3. Combine and Sort
      const combined = [...pointsHistory, ...badgesEarned]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, limit);

      // 4. Fetch User Details for combined entries
      const userIds = [...new Set(combined.map((c) => c.userId))];
      if (userIds.length === 0) return [];

      const userDetails = await db.query.user.findMany({
        where: sql`${user.id} IN ${userIds}`,
      });

      const userMap = new Map(userDetails.map((u: any) => [u.id, u]));

      return combined.map((entry) => ({
        ...entry,
        user: userMap.get(entry.userId),
      }));
    } catch (error) {
      log.error("Error in getGamificationActivityLog", { error, entityId });
      throw error;
    }
  }

  /**
   * Fetches a unified activity log of points and badges for a specific user
   */
  async getUserGamificationActivityLog({
    userId,
    entityId,
    limit = 20,
    offset = 0,
    db = this.db,
  }: {
    userId: string;
    entityId: string;
    limit?: number;
    offset?: number;
    db?: any;
  }) {
    try {
      // 1. Fetch Points History
      const pointsHistory = await db
        .select({
          id: userPointsHistory.id,
          type: sql<string>`'POINTS'`,
          points: userPointsHistory.pointsEarned,
          metadata: userPointsHistory.metadata,
          createdAt: userPointsHistory.createdAt,
          userId: gamificationUser.user,
          gamificationId: userPointsHistory.pointRuleId,
          ruleAction: pointRules.action,
          ruleDescription: pointRules.description,
        })
        .from(userPointsHistory)
        .innerJoin(
          gamificationUser,
          eq(userPointsHistory.userId, gamificationUser.id),
        )
        .innerJoin(pointRules, eq(userPointsHistory.pointRuleId, pointRules.id))
        .where(
          and(
            eq(gamificationUser.user, userId),
            eq(gamificationUser.entityId, entityId),
          ),
        )
        .orderBy(desc(userPointsHistory.createdAt))
        .limit(limit)
        .offset(offset);

      // 2. Fetch Badges Earned
      const badgesEarned = await db
        .select({
          id: userBadges.id,
          type: sql<string>`'BADGE'`,
          points: sql<number>`0`,
          metadata: sql<any>`null`,
          createdAt: userBadges.earnedAt,
          userId: gamificationUser.user,
          gamificationId: userBadges.badgeId,
          badgeName: badges.name,
          badgeDescription: badges.description,
          badgeIcon: badges.icon,
        })
        .from(userBadges)
        .innerJoin(gamificationUser, eq(userBadges.userId, gamificationUser.id))
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(
          and(
            eq(gamificationUser.user, userId),
            eq(gamificationUser.entityId, entityId),
            eq(userBadges.isCompleted, true),
          ),
        )
        .orderBy(desc(userBadges.earnedAt))
        .limit(limit)
        .offset(offset);

      // 3. Combine and Sort
      const combined = [...pointsHistory, ...badgesEarned]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, limit);

      // 4. Fetch User Detail
      const [userData] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId));

      return combined.map((entry) => ({
        ...entry,
        user: userData,
      }));
    } catch (error) {
      log.error("Error in getUserGamificationActivityLog", {
        error,
        userId,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Fetches leaderboard entries for an entity, optionally highlighting a specific user
   */
  async getLeaderboard({
    entityId,
    userId,
    limit = 20,
    offset = 0,
    db = this.db,
  }: {
    entityId: string;
    userId?: string;
    limit?: number;
    offset?: number;
    db?: any;
  }) {
    try {
      // 1. Get gamification profiles for the leaderboard page
      const entries = await db
        .select({
          id: gamificationUser.id,
          totalPoints: gamificationUser.totalPoints,
          userId: gamificationUser.user,
          currentRankId: gamificationUser.currentRankId,
        })
        .from(gamificationUser)
        .where(eq(gamificationUser.entityId, entityId))
        .orderBy(desc(gamificationUser.totalPoints))
        .limit(limit)
        .offset(offset);

      // 2. Fetch total users count
      const [totalRes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(gamificationUser)
        .where(eq(gamificationUser.entityId, entityId));

      const totalUsers = Number(totalRes?.count || 0);

      // 3. Helper to format a single entry
      const formatEntry = async (entry: any, customRank?: number) => {
        const [badgesCountRes] = await db
          .select({ count: sql<number>`count(*)` })
          .from(userBadges)
          .where(
            and(
              eq(userBadges.userId, entry.id),
              eq(userBadges.isCompleted, true),
            ),
          );

        let currentRank = null;
        if (entry.currentRankId) {
          [currentRank] = await db
            .select()
            .from(ranks)
            .where(eq(ranks.id, entry.currentRankId));
        }

        const [userData] = await db
          .select()
          .from(user)
          .where(eq(user.id, entry.userId));

        return {
          user: userData,
          totalPoints: entry.totalPoints,
          rank: customRank || 0,
          badgesCount: Number(badgesCountRes?.count || 0),
          currentRank,
        };
      };

      // 4. Enrich page entries
      const leaderboardEntries = await Promise.all(
        entries.map((entry: any, index: number) =>
          formatEntry(entry, offset + index + 1),
        ),
      );

      // 5. Fetch specific user's entry if requested
      let userEntry = null;
      if (userId) {
        const [userProfile] = await db
          .select({
            id: gamificationUser.id,
            totalPoints: gamificationUser.totalPoints,
            userId: gamificationUser.user,
            currentRankId: gamificationUser.currentRankId,
          })
          .from(gamificationUser)
          .where(
            and(
              eq(gamificationUser.user, userId),
              eq(gamificationUser.entityId, entityId),
            ),
          );

        if (userProfile) {
          // Find rank via count of players with more points
          const [rankRes] = await db
            .select({ count: sql<number>`count(*)` })
            .from(gamificationUser)
            .where(
              and(
                eq(gamificationUser.entityId, entityId),
                sql`${gamificationUser.totalPoints} > ${userProfile.totalPoints}`,
              ),
            );

          userEntry = await formatEntry(
            userProfile,
            Number(rankRes?.count || 0) + 1,
          );
        }
      }

      return {
        entries: leaderboardEntries,
        totalUsers,
        userEntry,
      };
    } catch (error) {
      log.error("Error in getLeaderboard", { error, entityId, userId });
      throw error;
    }
  }

  /**
   * Fetches the user's progress towards the next level
   */
  async getUserNextLevelProgress({
    userId,
    entityId,
    db = this.db,
  }: {
    userId: string;
    entityId: string;
    db?: any;
  }) {
    try {
      // 1. Get user and current rank
      const profile = await this.getUserGamificationProfile({
        userId,
        entityId,
        db,
      });

      if (!profile) {
        return {
          currentPoints: 0,
          nextLevelPoints: 0,
          pointsToNextLevel: 0,
          percentage: 0,
          currentRank: null,
          nextRank: null,
        };
      }

      // 2. Get all active ranks for the entity, sorted by minPoints
      const allRanks = await db
        .select()
        .from(ranks)
        .where(and(eq(ranks.entityId, entityId), eq(ranks.isActive, true)))
        .orderBy(ranks.minPoints);

      if (allRanks.length === 0) {
        return {
          currentPoints: profile.totalPoints,
          nextLevelPoints: 0,
          pointsToNextLevel: 0,
          percentage: 0,
          currentRank: profile.currentRank,
          nextRank: null,
        };
      }

      // 3. Find current rank and next rank
      let currentRank = profile.currentRank;
      let nextRank = null;

      if (!currentRank) {
        nextRank = allRanks[0];
      } else {
        const currentIndex = allRanks.findIndex(
          (r: any) => r.id === currentRank.id,
        );
        if (currentIndex !== -1 && currentIndex < allRanks.length - 1) {
          nextRank = allRanks[currentIndex + 1];
        }
      }

      // 4. Calculate progress
      if (!nextRank) {
        // Max level reached
        return {
          currentPoints: profile.totalPoints,
          nextLevelPoints: currentRank?.minPoints || 0,
          pointsToNextLevel: 0,
          percentage: 100,
          currentRank,
          nextRank: null,
        };
      }

      const pointsInCurrentRank = currentRank ? currentRank.minPoints : 0;
      const pointsForNextRank = nextRank.minPoints;

      const totalPointsNeeded = pointsForNextRank - pointsInCurrentRank;
      const pointsEarnedInLevel = profile.totalPoints - pointsInCurrentRank;

      let percentage = (pointsEarnedInLevel / totalPointsNeeded) * 100;
      percentage = Math.max(0, Math.min(100, percentage)); // Clamp between 0-100

      return {
        currentPoints: profile.totalPoints,
        nextLevelPoints: pointsForNextRank,
        pointsToNextLevel: Math.max(0, pointsForNextRank - profile.totalPoints),
        percentage: Math.round(percentage * 100) / 100,
        currentRank,
        nextRank,
      };
    } catch (error) {
      log.error("Error in getUserNextLevelProgress", {
        error,
        userId,
        entityId,
      });
      throw error;
    }
  }
}
