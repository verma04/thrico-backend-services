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
  user,
} from "@thrico/database";
// import { equal } from "assert";
import { eq, desc, and, gte, count, sql } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { logger } from "@thrico/logging";

import { gamificationClient } from "@thrico/grpc";
import { GamificationQueryService } from "@thrico/services";

export const gamificationResolvers = {
  Query: {
    async getGamificationActivityLog(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const { limit, offset } = input || {};
        const queryService = new GamificationQueryService(db);
        return await queryService.getGamificationActivityLog({
          entityId: entity,
          limit: limit || 20,
          offset: offset || 0,
        });
      } catch (error: any) {
        logger.error(`Error in getGamificationActivityLog: ${error.message}`, {
          error,
        });
        throw error;
      }
    },
    // Core Gamification
    async getEntityGamificationModules(_: any, {}: any, context: any) {
      try {
        const { entityId } = await checkAuth(context);
        if (!entityId) {
          throw new GraphQLError("Entity ID is required");
        }
        const result = await gamificationClient.getEntityGamificationModules(
          entityId
        );
        return {
          modules: result.modules || [],
          triggers: result.triggers || [],
        };
      } catch (error: any) {
        logger.error(
          `Error in getEntityGamificationModules: ${error.message}`,
          { error }
        );
        throw error;
      }
    },
    async getGamificationModules(_: any, {}: any, context: any) {
      try {
        await checkAuth(context);
        const result = await gamificationClient.getGamificationModules();
        return result || [];
      } catch (error: any) {
        logger.error(`Error in getGamificationModules: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    async getModuleTriggers(_: any, { moduleId }: any, context: any) {
      try {
        await checkAuth(context);
        const result = await gamificationClient.getModuleTriggers(moduleId);
        return result || [];
      } catch (error: any) {
        logger.error(`Error in getModuleTriggers: ${error.message}`, { error });
        throw error;
      }
    },

    async getBadges(_: any, { filter, pagination }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const conditions = [eq(badges.entityId, entity)];

        if (filter) {
          if (filter.type) {
            const dbType = filter.type === "ACTION" ? "ACTION" : "POINTS";
            conditions.push(eq(badges.type, dbType));
          }
          if (filter.module) conditions.push(eq(badges.module, filter.module));

          // Handle isActive filter explicitly if provided
          if (filter.isActive !== undefined && filter.isActive !== null) {
            conditions.push(eq(badges.isActive, filter.isActive));
          }
        }

        const limit = pagination?.limit || 50;
        const offset = pagination?.offset || 0;

        return await db.query.badges.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: desc(badges.createdAt),
        });
      } catch (error: any) {
        logger.error(`Error in badges query: ${error.message}`, { error });
        throw error;
      }
    },

    async getPointRules(_: any, { filter }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const conditions = [eq(pointRules.entityId, entity)];

        if (filter) {
          if (filter.module)
            conditions.push(eq(pointRules.module, filter.module));
          if (filter.trigger)
            conditions.push(eq(pointRules.trigger, filter.trigger));
          if (filter.isActive !== undefined && filter.isActive !== null) {
            conditions.push(eq(pointRules.isActive, filter.isActive));
          }
        }

        return await db.query.pointRules.findMany({
          where: and(...conditions),
          orderBy: desc(pointRules.createdAt),
        });
      } catch (error: any) {
        logger.error(`Error in getPointRules: ${error.message}`, { error });
        throw error;
      }
    },

    async getPointRuleStats(_: any, {}: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const allRules = await db
          .select({
            count: count(),
            isActive: pointRules.isActive,
            trigger: pointRules.trigger,
          })
          .from(pointRules)
          .where(eq(pointRules.entityId, entity))
          .groupBy(pointRules.isActive, pointRules.trigger);

        let totalRules = 0;
        let activeRules = 0;
        let firstTimeRules = 0;
        let recurringRules = 0;

        for (const rule of allRules) {
          const ruleCount = Number(rule.count);
          totalRules += ruleCount;

          if (rule.isActive) {
            activeRules += ruleCount;
          }

          if (rule.trigger === "FIRST_TIME") {
            firstTimeRules += ruleCount;
          } else if (rule.trigger === "RECURRING") {
            recurringRules += ruleCount;
          }
        }

        return {
          totalRules,
          activeRules,
          firstTimeRules,
          recurringRules,
        };
      } catch (error: any) {
        logger.error(`Error in getPointRuleStats: ${error.message}`, { error });
        throw error;
      }
    },

    async getRanks(_: any, { filter }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const conditions = [eq(ranks.entityId, entity)];

        if (filter) {
          if (filter.isActive !== undefined && filter.isActive !== null) {
            conditions.push(eq(ranks.isActive, filter.isActive));
          }
        }

        return await db.query.ranks.findMany({
          where: and(...conditions),
          orderBy: [ranks.order, ranks.createdAt],
        });
      } catch (error: any) {
        logger.error(`Error in getRanks: ${error.message}`, { error });
        throw error;
      }
    },

    async getLeaderboard(_: any, { pagination }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const queryService = new GamificationQueryService(db);
        return await queryService.getLeaderboard({
          entityId: entity,
          limit: pagination?.limit || 20,
          offset: pagination?.offset || 0,
        });
      } catch (error: any) {
        logger.error(`Error in getLeaderboard: ${error.message}`, { error });
        throw error;
      }
    },

    async getGamificationStats(_: any, {}: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        // 1. Basic Counts & Sums
        const [userStats] = await db
          .select({
            totalUsers: count(gamificationUser.id),
            totalPoints: sql<number>`sum(${gamificationUser.totalPoints})`,
          })
          .from(gamificationUser)
          .where(eq(gamificationUser.entityId, entity));

        const [activePointRulesCount] = await db
          .select({ count: count() })
          .from(pointRules)
          .where(
            and(eq(pointRules.entityId, entity), eq(pointRules.isActive, true))
          );

        const [activeBadgesCount] = await db
          .select({ count: count() })
          .from(badges)
          .where(and(eq(badges.entityId, entity), eq(badges.isActive, true)));

        const [activeRanksCount] = await db
          .select({ count: count() })
          .from(ranks)
          .where(and(eq(ranks.entityId, entity), eq(ranks.isActive, true)));

        const [totalBadgesEarnedCount] = await db
          .select({ count: count() })
          .from(userBadges)
          .innerJoin(badges, eq(userBadges.badgeId, badges.id))
          .where(
            and(eq(badges.entityId, entity), eq(userBadges.isCompleted, true))
          );

        // 2. Top Rank
        const topRank = await db.query.ranks.findFirst({
          where: and(eq(ranks.entityId, entity), eq(ranks.isActive, true)),
          orderBy: [desc(ranks.minPoints)],
        });

        // 3. Most Popular Badge
        const [popularBadgeRes] = await db
          .select({ badgeId: userBadges.badgeId, count: count() })
          .from(userBadges)
          .innerJoin(badges, eq(userBadges.badgeId, badges.id))
          .where(
            and(eq(badges.entityId, entity), eq(userBadges.isCompleted, true))
          )
          .groupBy(userBadges.badgeId)
          .orderBy(desc(count()))
          .limit(1);

        let mostPopularBadge = null;
        if (popularBadgeRes) {
          mostPopularBadge = await db.query.badges.findFirst({
            where: eq(badges.id, popularBadgeRes.badgeId),
          });
        }

        return {
          totalUsers: Number(userStats?.totalUsers || 0),
          totalPointsAwarded: Number(userStats?.totalPoints || 0),
          totalBadgesEarned: Number(totalBadgesEarnedCount?.count || 0),
          activePointRules: Number(activePointRulesCount?.count || 0),
          activeBadges: Number(activeBadgesCount?.count || 0),
          activeRanks: Number(activeRanksCount?.count || 0),
          topRank: topRank || null,
          mostPopularBadge: mostPopularBadge || null,
        };
      } catch (error: any) {
        logger.error(`Error in getGamificationStats: ${error.message}`, {
          error,
        });
        throw error;
      }
    },
  },

  Mutation: {
    async createBadge(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        console.log("Input", input);

        const targetValue = input.count || input.points;

        // if (input.type === "ACTION") {
        //   if (!input.module || !input.action || !input.count) {
        //     throw new GraphQLError(
        //       "For ACTION badges, module, action, and count are required."
        //     );
        //   }

        //   const existingBadge = await db.query.badges.findFirst({
        //     where: and(
        //       eq(badges.entityId, entity),
        //       eq(badges.type, "ACTION"),
        //       eq(badges.module, input.module),
        //       eq(badges.action, input.action),
        //       eq(badges.targetValue, targetValue)
        //     ),
        //   });

        //   if (existingBadge && existingBadge.isActive) {
        //     throw new GraphQLError(
        //       "A badge with this action and count already exists."
        //     );
        //   }
        // } else if (input.type === "POINTS") {
        //   if (!input.points) {
        //     throw new GraphQLError("For POINTS badges, points are required.");
        //   }

        //   const existingBadge = await db.query.badges.findFirst({
        //     where: and(
        //       eq(badges.entityId, entity),
        //       eq(badges.type, "POINTS"),
        //       eq(badges.targetValue, targetValue)
        //     ),
        //   });

        //   if (existingBadge && existingBadge.isActive) {
        //     throw new GraphQLError(
        //       "A badge with this point requirement already exists."
        //     );
        //   }
        // }

        // const payload = {
        //   name: input.name,
        //   description: input.description,
        //   type: (input.type === "ACTION" ? "ACTION" : "POINTS") as
        //     | "ACTION"
        //     | "POINTS",
        //   module: input.type === "ACTION" ? input.module : null,
        //   action: input.type === "ACTION" ? input.action : null,
        //   targetValue: targetValue,
        //   icon: input.icon,
        //   condition: input.condition || "",
        //   isActive: true,
        //   entityId: entity,
        // };

        // const [newBadge] = await db.insert(badges).values(payload).returning();
        // return newBadge;
      } catch (error: any) {
        logger.error(`Error in createBadge: ${error.message}`, {
          error,
          input,
        });

        // Handle unique constraint violation
        if (error.code === "23505") {
          if (input.type === "ACTION") {
            throw new GraphQLError(
              "A badge with this module, action, and count already exists."
            );
          } else {
            throw new GraphQLError(
              "A badge with this point requirement already exists."
            );
          }
        }

        throw error;
      }
    },

    async updateBadge(_: any, { id, input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const payload: any = { ...input, updatedAt: new Date() };

        if (input.type) {
          payload.type = input.type === "ACTION" ? "ACTION" : "POINTS";
        }

        // Map targetValue if provided
        if (input.targetValue !== undefined) {
          payload.targetValue = input.targetValue;
        }

        // Ensure entity ownership
        const [updatedBadge] = await db
          .update(badges)
          .set(payload)
          .where(and(eq(badges.id, id), eq(badges.entityId, entity)))
          .returning();

        if (!updatedBadge) {
          throw new GraphQLError(
            "Badge not found or you do not have permission to update it."
          );
        }

        return {
          ...updatedBadge,
          type: updatedBadge.type === "ACTION" ? "ACTION" : ("POINTS" as any),
        };
      } catch (error: any) {
        logger.error(`Error in updateBadge: ${error.message}`, {
          error,
          id,
          input,
        });
        throw error;
      }
    },

    async toggleBadge(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        // First fetch current state
        const badge = await db.query.badges.findFirst({
          where: and(eq(badges.id, id), eq(badges.entityId, entity)),
        });

        if (!badge) {
          throw new GraphQLError(
            "Badge not found or you do not have permission to toggle it."
          );
        }

        const [updatedBadge] = await db
          .update(badges)
          .set({
            isActive: !badge.isActive,
            updatedAt: new Date(),
          })
          .where(and(eq(badges.id, id), eq(badges.entityId, entity)))
          .returning();

        return {
          ...updatedBadge,
          type: updatedBadge.type === "ACTION" ? "ACTION" : ("POINTS" as any),
        };
      } catch (error: any) {
        logger.error(`Error in toggleBadge: ${error.message}`, {
          error,
          id,
        });
        throw error;
      }
    },

    async deleteBadge(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [deletedBadge] = await db
          .update(badges)
          .set({ isActive: false })
          .where(and(eq(badges.id, id), eq(badges.entityId, entity)))
          .returning();

        if (!deletedBadge) {
          throw new GraphQLError(
            "Badge not found or you do not have permission to delete it."
          );
        }

        return true;
      } catch (error: any) {
        logger.error(`Error in deleteBadge: ${error.message}`, { error, id });
        throw error;
      }
    },

    async createPointRule(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        console.log("Input", input);
        // Check specifically for duplicate rule with same module, action, trigger
        const existingRule = await db.query.pointRules.findFirst({
          where: and(
            eq(pointRules.entityId, entity),
            eq(pointRules.module, input.module),
            eq(pointRules.action, input.action),
            eq(pointRules.trigger, input.trigger),
            eq(pointRules.isActive, true)
          ),
        });

        if (existingRule) {
          throw new GraphQLError(
            "A point rule for this module, action, and trigger already exists."
          );
        }

        const payload = {
          ...input,
          entityId: entity,
          isActive: true,
        };

        const [newRule] = await db
          .insert(pointRules)
          .values(payload)
          .returning();
        return newRule;
      } catch (error: any) {
        logger.error(`Error in createPointRule: ${error.message}`, {
          error,
          input,
        });

        // Handle unique constraint violation
        if (error.code === "23505") {
          throw new GraphQLError(
            "A point rule for this module, action, and trigger already exists."
          );
        }

        throw error;
      }
    },

    async updatePointRule(_: any, { id, input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const payload: any = { ...input, updatedAt: new Date() };

        const [updatedRule] = await db
          .update(pointRules)
          .set(payload)
          .where(and(eq(pointRules.id, id), eq(pointRules.entityId, entity)))
          .returning();

        if (!updatedRule) {
          throw new GraphQLError(
            "Point rule not found or you do not have permission to update it."
          );
        }

        return updatedRule;
      } catch (error: any) {
        logger.error(`Error in updatePointRule: ${error.message}`, {
          error,
          id,
          input,
        });
        throw error;
      }
    },

    async togglePointRule(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        // First fetch current state
        const rule = await db.query.pointRules.findFirst({
          where: and(eq(pointRules.id, id), eq(pointRules.entityId, entity)),
        });

        if (!rule) {
          throw new GraphQLError(
            "Point rule not found or you do not have permission to toggle it."
          );
        }

        const [updatedRule] = await db
          .update(pointRules)
          .set({
            isActive: !rule.isActive,
            updatedAt: new Date(),
          })
          .where(and(eq(pointRules.id, id), eq(pointRules.entityId, entity)))
          .returning();

        return updatedRule;
      } catch (error: any) {
        logger.error(`Error in togglePointRule: ${error.message}`, {
          error,
          id,
        });
        throw error;
      }
    },

    async deletePointRule(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [deletedRule] = await db
          .update(pointRules)
          .set({ isActive: false })
          .where(and(eq(pointRules.id, id), eq(pointRules.entityId, entity)))
          .returning();

        if (!deletedRule) {
          throw new GraphQLError(
            "Point rule not found or you do not have permission to delete it."
          );
        }

        return true;
      } catch (error: any) {
        logger.error(`Error in deletePointRule: ${error.message}`, {
          error,
          id,
        });
        throw error;
      }
    },

    async createRank(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        // Validate min/max points logic
        if (
          input.maxPoints !== undefined &&
          input.minPoints > input.maxPoints
        ) {
          throw new GraphQLError(
            "Minimum points cannot be greater than maximum points."
          );
        }

        const payload = {
          ...input,
          entityId: entity,
          isActive: true,
        };

        const [newRank] = await db.insert(ranks).values(payload).returning();
        return newRank;
      } catch (error: any) {
        logger.error(`Error in createRank: ${error.message}`, {
          error,
          input,
        });
        throw error;
      }
    },

    async updateRank(_: any, { id, input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        // Validate min/max points logic if both are provided
        if (input.minPoints !== undefined && input.maxPoints !== undefined) {
          if (input.minPoints > input.maxPoints) {
            throw new GraphQLError(
              "Minimum points cannot be greater than maximum points."
            );
          }
        }

        const payload: any = { ...input, updatedAt: new Date() };

        const [updatedRank] = await db
          .update(ranks)
          .set(payload)
          .where(and(eq(ranks.id, id), eq(ranks.entityId, entity)))
          .returning();

        if (!updatedRank) {
          throw new GraphQLError(
            "Rank not found or you do not have permission to update it."
          );
        }

        return updatedRank;
      } catch (error: any) {
        logger.error(`Error in updateRank: ${error.message}`, {
          error,
          id,
          input,
        });
        throw error;
      }
    },

    async toggleRank(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        // First fetch current state
        const rank = await db.query.ranks.findFirst({
          where: and(eq(ranks.id, id), eq(ranks.entityId, entity)),
        });

        if (!rank) {
          throw new GraphQLError(
            "Rank not found or you do not have permission to toggle it."
          );
        }

        const [updatedRank] = await db
          .update(ranks)
          .set({
            isActive: !rank.isActive,
            updatedAt: new Date(),
          })
          .where(and(eq(ranks.id, id), eq(ranks.entityId, entity)))
          .returning();

        return updatedRank;
      } catch (error: any) {
        logger.error(`Error in toggleRank: ${error.message}`, {
          error,
          id,
        });
        throw error;
      }
    },

    async updateRankOrder(_: any, { rankOrders }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        // Update each rank's order
        const updatedRanks = [];
        for (const { id, order } of rankOrders) {
          const [updatedRank] = await db
            .update(ranks)
            .set({ order, updatedAt: new Date() })
            .where(and(eq(ranks.id, id), eq(ranks.entityId, entity)))
            .returning();

          if (!updatedRank) {
            throw new GraphQLError(
              `Rank with id ${id} not found or you do not have permission to update it.`
            );
          }

          updatedRanks.push(updatedRank);
        }

        return updatedRanks;
      } catch (error: any) {
        logger.error(`Error in updateRankOrder: ${error.message}`, {
          error,
          rankOrders,
        });
        throw error;
      }
    },

    async deleteRank(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [deletedRank] = await db
          .update(ranks)
          .set({ isActive: false })
          .where(and(eq(ranks.id, id), eq(ranks.entityId, entity)))
          .returning();

        if (!deletedRank) {
          throw new GraphQLError(
            "Rank not found or you do not have permission to delete it."
          );
        }

        return true;
      } catch (error: any) {
        logger.error(`Error in deleteRank: ${error.message}`, { error, id });
        throw error;
      }
    },
  },

  // Field Resolvers
  Badge: {
    type: (parent: any) => {
      if (parent.type === "ACTION") return "ACTION";
      if (parent.type === "POINTS") return "POINTS";
      return parent.type;
    },
  },
};
