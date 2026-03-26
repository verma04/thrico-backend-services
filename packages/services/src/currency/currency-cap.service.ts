import { redis } from "@thrico/database";
import {
  entityCurrencyConfig,
  activityCaps,
  tcConversionCaps,
  redemptionCaps,
  entityCurrencyWallet,
  tcCoinWallet,
} from "@thrico/database";
import { eq, and, sql } from "drizzle-orm";
import { log } from "@thrico/logging";

export class CurrencyCapService {
  /**
   * Check if user has exceeded activity cap for a given activity type
   * Uses Redis counters with TTL for real-time cap checks
   */
  static async checkActivityCap({
    userId,
    entityId,
    activityType,
    db,
  }: {
    userId: string;
    entityId: string;
    activityType: string;
    db: any;
  }): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get caps from DB
      const cap = await db.query.activityCaps.findFirst({
        where: and(
          eq(activityCaps.entityId, entityId),
          eq(activityCaps.activityType, activityType),
        ),
      });

      if (!cap) {
        return { allowed: true }; // No cap configured
      }

      const now = new Date();

      // Daily cap check
      if (cap.dailyCap > 0) {
        const dailyKey = `currency:acap:${userId}:${entityId}:${activityType}:d:${now.toISOString().slice(0, 10)}`;
        const dailyCount = parseInt((await redis.client.get(dailyKey)) || "0");
        if (dailyCount >= cap.dailyCap) {
          return { allowed: false, reason: "Daily activity cap exceeded" };
        }
      }

      // Weekly cap check
      if (cap.weeklyCap > 0) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekKey = `currency:acap:${userId}:${entityId}:${activityType}:w:${weekStart.toISOString().slice(0, 10)}`;
        const weeklyCount = parseInt((await redis.client.get(weekKey)) || "0");
        if (weeklyCount >= cap.weeklyCap) {
          return { allowed: false, reason: "Weekly activity cap exceeded" };
        }
      }

      // Monthly cap check
      if (cap.monthlyCap > 0) {
        const monthKey = `currency:acap:${userId}:${entityId}:${activityType}:m:${now.toISOString().slice(0, 7)}`;
        const monthlyCount = parseInt(
          (await redis.client.get(monthKey)) || "0",
        );
        if (monthlyCount >= cap.monthlyCap) {
          return { allowed: false, reason: "Monthly activity cap exceeded" };
        }
      }

      return { allowed: true };
    } catch (err: any) {
      log.error("Error checking activity cap", {
        err: err.message,
        userId,
        entityId,
        activityType,
      });
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Increment activity counter after successful activity
   */
  static async incrementActivityCount({
    userId,
    entityId,
    activityType,
  }: {
    userId: string;
    entityId: string;
    activityType: string;
  }) {
    try {
      const now = new Date();

      // Increment daily counter (expire at end of day)
      const dailyKey = `currency:acap:${userId}:${entityId}:${activityType}:d:${now.toISOString().slice(0, 10)}`;
      await redis.client.incr(dailyKey);
      await redis.client.expire(dailyKey, 86400);

      // Increment weekly counter (expire in 7 days)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekKey = `currency:acap:${userId}:${entityId}:${activityType}:w:${weekStart.toISOString().slice(0, 10)}`;
      await redis.client.incr(weekKey);
      await redis.client.expire(weekKey, 604800);

      // Increment monthly counter (expire in 31 days)
      const monthKey = `currency:acap:${userId}:${entityId}:${activityType}:m:${now.toISOString().slice(0, 7)}`;
      await redis.client.incr(monthKey);
      await redis.client.expire(monthKey, 2678400);
    } catch (err: any) {
      log.error("Error incrementing activity count", {
        err: err.message,
        userId,
        entityId,
        activityType,
      });
    }
  }

  /**
   * Check if user has exceeded TC conversion caps
   */
  static async checkTCConversionCap({
    userId,
    entityId,
    amount,
    db,
  }: {
    userId: string;
    entityId: string;
    amount: number;
    db: any;
  }): Promise<{ allowed: boolean; maxAllowed: number; reason?: string }> {
    try {
      const caps = await db.query.tcConversionCaps.findFirst({
        where: eq(tcConversionCaps.entityId, entityId),
      });

      if (!caps) {
        return { allowed: true, maxAllowed: amount }; // No caps configured
      }

      const now = new Date();
      let effectiveMax = amount;

      // Daily TC conversion cap
      if (Number(caps.maxTcPerDay) > 0) {
        const dailyKey = `currency:tccap:${userId}:${entityId}:d:${now.toISOString().slice(0, 10)}`;
        const dailyUsed = parseFloat((await redis.client.get(dailyKey)) || "0");
        const dailyRemaining = Number(caps.maxTcPerDay) - dailyUsed;
        if (dailyRemaining <= 0) {
          return {
            allowed: false,
            maxAllowed: 0,
            reason: "Daily TC conversion cap exceeded",
          };
        }
        effectiveMax = Math.min(effectiveMax, dailyRemaining);
      }

      // Monthly TC conversion cap
      if (Number(caps.maxTcPerMonth) > 0) {
        const monthKey = `currency:tccap:${userId}:${entityId}:m:${now.toISOString().slice(0, 7)}`;
        const monthlyUsed = parseFloat(
          (await redis.client.get(monthKey)) || "0",
        );
        const monthlyRemaining = Number(caps.maxTcPerMonth) - monthlyUsed;
        if (monthlyRemaining <= 0) {
          return {
            allowed: false,
            maxAllowed: 0,
            reason: "Monthly TC conversion cap exceeded",
          };
        }
        effectiveMax = Math.min(effectiveMax, monthlyRemaining);
      }

      // Lifetime per-entity TC cap
      if (Number(caps.maxTcPerEntity) > 0) {
        const wallet = await db.query.entityCurrencyWallet.findFirst({
          where: and(
            eq(entityCurrencyWallet.userId, userId),
            eq(entityCurrencyWallet.entityId, entityId),
          ),
        });
        const totalConverted = Number(wallet?.totalConvertedToTc || 0);
        const lifetimeRemaining = Number(caps.maxTcPerEntity) - totalConverted;
        if (lifetimeRemaining <= 0) {
          return {
            allowed: false,
            maxAllowed: 0,
            reason: "Lifetime TC conversion cap exceeded for this entity",
          };
        }
        effectiveMax = Math.min(effectiveMax, lifetimeRemaining);
      }

      return { allowed: true, maxAllowed: effectiveMax };
    } catch (err: any) {
      log.error("Error checking TC conversion cap", {
        err: err.message,
        userId,
        entityId,
      });
      return { allowed: true, maxAllowed: amount };
    }
  }

  /**
   * Record TC conversion usage for cap tracking
   */
  static async recordTCConversion({
    userId,
    entityId,
    amount,
  }: {
    userId: string;
    entityId: string;
    amount: number;
  }) {
    try {
      const now = new Date();

      const dailyKey = `currency:tccap:${userId}:${entityId}:d:${now.toISOString().slice(0, 10)}`;
      await redis.client.incrbyfloat(dailyKey, amount);
      await redis.client.expire(dailyKey, 86400);

      const monthKey = `currency:tccap:${userId}:${entityId}:m:${now.toISOString().slice(0, 7)}`;
      await redis.client.incrbyfloat(monthKey, amount);
      await redis.client.expire(monthKey, 2678400);
    } catch (err: any) {
      log.error("Error recording TC conversion", {
        err: err.message,
        userId,
        entityId,
      });
    }
  }

  /**
   * Check if user has exceeded redemption caps
   */
  static async checkRedemptionCap({
    userId,
    entityId,
    tcAmount,
    db,
  }: {
    userId: string;
    entityId: string;
    tcAmount: number;
    db: any;
  }): Promise<{ allowed: boolean; maxAllowed: number; reason?: string }> {
    try {
      const caps = await db.query.redemptionCaps.findFirst({
        where: eq(redemptionCaps.entityId, entityId),
      });

      if (!caps) {
        return { allowed: true, maxAllowed: tcAmount };
      }

      let effectiveMax = tcAmount;

      // Per-order cap
      if (Number(caps.maxTcPerOrder) > 0) {
        effectiveMax = Math.min(effectiveMax, Number(caps.maxTcPerOrder));
      }

      // Monthly redemption cap
      if (Number(caps.maxTcPerMonth) > 0) {
        const now = new Date();
        const monthKey = `currency:rcap:${userId}:${entityId}:m:${now.toISOString().slice(0, 7)}`;
        const monthlyUsed = parseFloat(
          (await redis.client.get(monthKey)) || "0",
        );
        const monthlyRemaining = Number(caps.maxTcPerMonth) - monthlyUsed;
        if (monthlyRemaining <= 0) {
          return {
            allowed: false,
            maxAllowed: 0,
            reason: "Monthly TC redemption cap exceeded",
          };
        }
        effectiveMax = Math.min(effectiveMax, monthlyRemaining);
      }

      if (effectiveMax <= 0) {
        return {
          allowed: false,
          maxAllowed: 0,
          reason: "Redemption cap exceeded",
        };
      }

      return { allowed: true, maxAllowed: effectiveMax };
    } catch (err: any) {
      log.error("Error checking redemption cap", {
        err: err.message,
        userId,
        entityId,
      });
      return { allowed: true, maxAllowed: tcAmount };
    }
  }

  /**
   * Record TC redemption for cap tracking
   */
  static async recordRedemption({
    userId,
    entityId,
    tcAmount,
  }: {
    userId: string;
    entityId: string;
    tcAmount: number;
  }) {
    try {
      const now = new Date();
      const monthKey = `currency:rcap:${userId}:${entityId}:m:${now.toISOString().slice(0, 7)}`;
      await redis.client.incrbyfloat(monthKey, tcAmount);
      await redis.client.expire(monthKey, 2678400);
    } catch (err: any) {
      log.error("Error recording redemption", {
        err: err.message,
        userId,
        entityId,
      });
    }
  }
}
