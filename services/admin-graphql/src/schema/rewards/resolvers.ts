import { rewards, vouchers, redemptions } from "@thrico/database";
import { eq, and, ilike, or, desc, sql, lt, gte } from "drizzle-orm";
import { StorageService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";
import { getDaterangeFromInput } from "../dashboard/resolvers";
import { spinResolvers } from "./spin/resolvers";
import { scratchResolvers } from "./scratch/resolvers";
import { matchWinResolvers } from "./match-win/resolvers";
import { spinScratchStatsResolvers } from "./stats/resolvers";
import { GraphQLError } from "graphql";

export const rewardsResolvers = {
  Query: {
    async getRewardById(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);

      const result = await db.query.rewards.findFirst({
        where: and(eq(rewards.id, id), eq(rewards.entityId, entity)),
      });

      return result;
    },

    async getRewards(
      _: any,
      { status, search, pagination }: any,
      context: any,
    ) {
      const { entity, db } = await checkAuth(context);
      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;

      const whereConditions = [eq(rewards.entityId, entity)];
      if (status) whereConditions.push(eq(rewards.status, status));
      if (search) {
        whereConditions.push(
          or(
            ilike(rewards.title, `%${search}%`),
            ilike(rewards.description, `%${search}%`),
          ) as any,
        );
      }

      const results = await db
        .select({
          id: rewards.id,
          title: rewards.title,
          description: rewards.description,
          image: rewards.image,
          tcCost: rewards.tcCost,
          inventoryRequired: rewards.inventoryRequired,
          perUserLimit: rewards.perUserLimit,
          totalUsageLimit: rewards.totalUsageLimit,
          minAccountAge: rewards.minAccountAge,
          minActivityRequired: rewards.minActivityRequired,
          blockWarnedUsers: rewards.blockWarnedUsers,
          cooldownPeriod: rewards.cooldownPeriod,
          status: rewards.status,
          isActive: rewards.isActive,
          createdAt: rewards.createdAt,
          updatedAt: rewards.updatedAt,
          rewardMechanism: rewards.rewardMechanism,
          totalVouchers:
            sql`(SELECT count(*) FROM ${vouchers} WHERE ${vouchers.rewardId} = ${rewards.id})`.mapWith(
              Number,
            ),
          remainingVouchers:
            sql`(SELECT count(*) FROM ${vouchers} WHERE ${vouchers.rewardId} = ${rewards.id} AND ${vouchers.isUsed} = false)`.mapWith(
              Number,
            ),
          redeemedCount:
            sql`(SELECT count(*) FROM ${redemptions} WHERE ${redemptions.rewardId} = ${rewards.id})`.mapWith(
              Number,
            ),
        })
        .from(rewards)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(rewards.createdAt));

      return results;
    },

    async getVouchers(_: any, { rewardId, pagination }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      const { page = 1, limit = 20 } = pagination || {};
      const offset = (page - 1) * limit;

      return await db.query.vouchers.findMany({
        where: and(
          eq(vouchers.rewardId, rewardId),
          eq(vouchers.entityId, entity),
        ),
        limit,
        offset,
        orderBy: [desc(vouchers.createdAt)],
        with: {
          reward: true,
        },
      });
    },

    async getAllVouchers(
      _: any,
      { pagination, status, rewardId }: any,
      context: any,
    ) {
      const { entity, db } = await checkAuth(context);
      const { page = 1, limit = 20 } = pagination || {};
      const offset = (page - 1) * limit;

      const whereConditions = [eq(vouchers.entityId, entity)];

      if (rewardId) {
        whereConditions.push(eq(vouchers.rewardId, rewardId));
      }

      if (status === "USED") {
        whereConditions.push(eq(vouchers.isUsed, true));
      } else if (status === "AVAILABLE") {
        whereConditions.push(eq(vouchers.isUsed, false));
      }

      return await db.query.vouchers.findMany({
        where: and(...whereConditions),
        limit,
        offset,
        orderBy: [desc(vouchers.createdAt)],
        with: {
          reward: true,
        },
      });
    },

    async getVouchersByRewardMechanism(
      _: any,
      { mechanism, pagination }: any,
      context: any,
    ) {
      const { entity, db } = await checkAuth(context);
      const { page = 1, limit = 20 } = pagination || {};
      const offset = (page - 1) * limit;

      const results = await db
        .select({
          voucher: vouchers,
          reward: rewards,
        })
        .from(vouchers)
        .innerJoin(rewards, eq(vouchers.rewardId, rewards.id))
        .where(
          and(
            eq(vouchers.entityId, entity),
            sql`${mechanism} = ANY(${rewards.rewardMechanism})`,
          ),
        )
        .limit(limit)
        .offset(offset)
        .orderBy(desc(vouchers.createdAt));

      console.log({
        results,
        mechanism,
      });

      return results.map((row: any) => ({
        ...row.voucher,
        reward: row.reward,
      }));
    },

    async getRedemptions(
      _: any,
      { userId, status, pagination }: any,
      context: any,
    ) {
      const { entity, db } = await checkAuth(context);
      const { page = 1, limit = 10 } = pagination || {};
      const offset = (page - 1) * limit;

      const whereConditions = [eq(redemptions.entityId, entity)];
      if (userId) whereConditions.push(eq(redemptions.userId, userId));
      if (status) whereConditions.push(eq(redemptions.status, status));

      return await db.query.redemptions.findMany({
        where: and(...whereConditions),
        limit,
        offset,
        orderBy: [desc(redemptions.createdAt)],
        with: {
          reward: true,
          user: true,
        },
      });
    },

    async getRewardStats(_: any, { timeRange, dateRange }: any, context: any) {
      const { entity, db } = await checkAuth(context);

      const { startDate, endDate } = getDaterangeFromInput(
        timeRange,
        dateRange,
      );

      // Get aggregate stats
      const [stats] = await db
        .select({
          totalRedemptions: sql`count(*)`.mapWith(Number),
          totalTcBurned: sql`sum(${redemptions.tcUsed})`.mapWith(Number),
        })
        .from(redemptions)
        .where(
          and(
            eq(redemptions.entityId, entity),
            lt(redemptions.createdAt, endDate),
          ),
        );

      const activeCoupons = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(rewards)
        .where(
          and(
            eq(rewards.entityId, entity),
            eq(rewards.status, "ACTIVE"),
            lt(rewards.createdAt, endDate),
          ),
        );

      // Low inventory logic: items with < 5 vouchers left that require inventory
      const lowInventoryItems = await db
        .select({ count: sql`count(distinct ${rewards.id})`.mapWith(Number) })
        .from(rewards)
        .leftJoin(
          vouchers,
          and(eq(vouchers.rewardId, rewards.id), eq(vouchers.isUsed, false)),
        )
        .where(
          and(
            eq(rewards.entityId, entity),
            eq(rewards.inventoryRequired, true),
            eq(rewards.status, "ACTIVE"),
            lt(rewards.createdAt, endDate),
          ),
        )
        .groupBy(rewards.id)
        .having(sql`count(${vouchers.id}) < 5`);

      // Redemption trend for selected period
      const trend = await db
        .select({
          date: sql`DATE_TRUNC('day', ${redemptions.createdAt})::text`,
          count: sql`count(*)`.mapWith(Number),
          value: sql`sum(${redemptions.tcUsed})`.mapWith(Number),
        })
        .from(redemptions)
        .where(
          and(
            eq(redemptions.entityId, entity),
            gte(redemptions.createdAt, startDate),
            lt(redemptions.createdAt, endDate),
          ),
        )
        .groupBy(sql`DATE_TRUNC('day', ${redemptions.createdAt})`)
        .orderBy(sql`DATE_TRUNC('day', ${redemptions.createdAt})`);

      return {
        totalRedemptions: stats?.totalRedemptions || 0,
        totalTcBurned: stats?.totalTcBurned || 0,
        activeCoupons: activeCoupons[0]?.count || 0,
        lowInventoryItems: lowInventoryItems.length || 0,
        redemptionTrend: trend.map((t) => ({
          date: t.date,
          count: t.count,
          value: t.value || 0,
        })),
      };
    },

    async getRewardSecuritySettings(_: any, __: any, context: any) {
      const { entity, db } = await checkAuth(context);
      // This would ideally come from an entity-specific config table
      // For now, returning defaults related to the entity config if exists
      return {
        dailyRedemptionLimit: 100,
        requireKyc: true,
        lockToDeviceId: true,
        maxIpVelocity: 5,
      };
    },

    ...spinResolvers.Query,
    ...scratchResolvers.Query,
    ...matchWinResolvers.Query,
    ...spinScratchStatsResolvers.Query,
  },

  Mutation: {
    async createReward(_: any, { input }: any, context: any) {
      const { entity, db, id } = await checkAuth(context);

      const { imageFile, ...rest } = input;
      let imageUrl = input.image;

      if (imageFile) {
        const uploaded = await StorageService.uploadImages(
          [imageFile],
          entity,
          "REWARDS",
          id,
          db,
        );
        if (uploaded && uploaded.length > 0) {
          imageUrl = uploaded[0].file;
        }
      }

      const [newReward] = await db
        .insert(rewards)
        .values({
          ...(rest as any),
          image: imageUrl,
          entityId: entity,
          status: "ACTIVE",
          rewardMechanism: rest.rewardMechanism || ["COUPON"],
        })
        .returning();

      await createAuditLog(db, {
        adminId: id,
        entityId: entity,
        module: "REWARDS",
        action: "CREATE_REWARD",
        resourceId: newReward.id,
        newState: input,
      });

      return newReward;
    },

    async updateReward(_: any, { id, input }: any, context: any) {
      const { entity, db, id: userId } = await checkAuth(context);

      const { imageFile, ...rest } = input;
      let imageUrl = input.image;

      if (imageFile) {
        const uploaded = await StorageService.uploadImages(
          [imageFile],
          entity,
          "REWARDS",
          userId,
          db,
        );
        if (uploaded && uploaded.length > 0) {
          imageUrl = uploaded[0].file;
        }
      }

      const [updatedReward] = await db
        .update(rewards)
        .set({
          ...rest,
          image: imageUrl,
          ...(rest.rewardMechanism && {
            rewardMechanism: rest.rewardMechanism,
          }),
        })
        .where(and(eq(rewards.id, id), eq(rewards.entityId, entity)))
        .returning();

      await createAuditLog(db, {
        adminId: userId,
        entityId: entity,
        module: "REWARDS",
        action: "UPDATE_REWARD",
        resourceId: id,
        newState: input,
      });

      return updatedReward;
    },

    async uploadVouchers(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      const { rewardId, vouchers: codes } = input;

      const voucherValues = codes.map((code: string) => ({
        rewardId,
        code,
        entityId: entity,
      }));

      await db.insert(vouchers).values(voucherValues);

      await createAuditLog(db, {
        adminId: entity,
        entityId: entity,
        module: "REWARDS",
        action: "UPLOAD_VOUCHERS",
        resourceId: rewardId,
        newState: { count: codes.length },
      });

      return true;
    },

    async updateRewardSecuritySettings(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      // Mock implementation as discussed above
      return {
        dailyRedemptionLimit: input.dailyRedemptionLimit || 100,
        requireKyc: input.requireKyc !== undefined ? input.requireKyc : true,
        lockToDeviceId:
          input.lockToDeviceId !== undefined ? input.lockToDeviceId : true,
        maxIpVelocity: input.maxIpVelocity || 5,
      };
    },

    async markVoucherAsUsed(_: any, { voucherId }: any, context: any) {
      const { entity, db } = await checkAuth(context);

      const [updatedVoucher] = await db
        .update(vouchers)
        .set({
          isUsed: true,
          assignedAt: new Date(),
        })
        .where(and(eq(vouchers.id, voucherId), eq(vouchers.entityId, entity)))
        .returning();

      return updatedVoucher;
    },

    async deleteVoucher(_: any, { voucherId }: any, context: any) {
      const { entity, db } = await checkAuth(context);

      await db
        .delete(vouchers)
        .where(and(eq(vouchers.id, voucherId), eq(vouchers.entityId, entity)));

      return true;
    },

    async claimRedemption(_: any, { redemptionId }: any, context: any) {
      const { entity, db } = await checkAuth(context);

      const [updated] = await db
        .update(redemptions)
        .set({
          status: "CLAIMED",
          claimedAt: new Date(),
        })
        .where(
          and(
            eq(redemptions.id, redemptionId),
            eq(redemptions.entityId, entity),
          ),
        )
        .returning();

      if (!updated) {
        throw new GraphQLError("Redemption not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return await db.query.redemptions.findFirst({
        where: eq(redemptions.id, redemptionId),
        with: {
          reward: true,
          user: true,
        },
      });
    },

    ...spinResolvers.Mutation,
    ...scratchResolvers.Mutation,
    ...matchWinResolvers.Mutation,
  },
};
