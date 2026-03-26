import {
  CurrencyTransaction,
  GlobalCurrencyTransaction,
  RedemptionHistory,
} from "@thrico/database";
import { log } from "@thrico/logging";
import { v4 as uuidv4 } from "uuid";

export type TransactionType =
  | "POINTS_TO_EC"
  | "EC_CREDIT"
  | "EC_DEBIT"
  | "TC_CREDIT"
  | "TC_DEBIT";

export type RedemptionStatus = "PENDING" | "COMPLETED" | "REVERSED";

export class CurrencyHistoryService {
  /**
   * Log a currency transaction to DynamoDB
   */
  static async logTransaction({
    userId,
    type,
    entityId,
    amount,
    balanceBefore,
    balanceAfter,
    metadata,
  }: {
    userId: string;
    type: TransactionType;
    entityId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    metadata?: Record<string, any>;
  }) {
    try {
      const transactionId = `${Date.now()}-${uuidv4().slice(0, 8)}`;
      await CurrencyTransaction.create({
        userId,
        transactionId,
        type,
        entityId,
        amount,
        balanceBefore,
        balanceAfter,
        metadata: metadata || {},
        timestamp: Date.now(),
      });
      log.info("Currency transaction logged", {
        userId,
        type,
        entityId,
        amount,
        transactionId,
      });
      return transactionId;
    } catch (err: any) {
      log.error("Failed to log currency transaction", {
        err: err.message,
        userId,
        type,
        entityId,
      });
      // Non-critical — don't throw, but log for monitoring
    }
  }

  /**
   * Log a GLOBAL currency transaction to DynamoDB (TC Coin Wallet)
   */
  static async logGlobalTransaction({
    thricoId,
    type,
    entityId,
    amount,
    balanceBefore,
    balanceAfter,
    metadata,
  }: {
    thricoId: string;
    type: "EC_TO_TC" | "TC_CREDIT" | "TC_DEBIT";
    entityId?: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    metadata?: Record<string, any>;
  }) {
    try {
      const transactionId = `${Date.now()}-${uuidv4().slice(0, 8)}`;
      await GlobalCurrencyTransaction.create({
        thricoId,
        transactionId,
        type,
        entityId,
        amount,
        balanceBefore,
        balanceAfter,
        metadata: metadata || {},
        timestamp: Date.now(),
      });
      log.info("Global currency transaction logged", {
        thricoId,
        type,
        entityId,
        amount,
        transactionId,
      });
      return transactionId;
    } catch (err: any) {
      log.error("Failed to log global currency transaction", {
        err: err.message,
        thricoId,
        type,
        entityId,
      });
      // Non-critical
    }
  }

  /**
   * Get transaction history for a user, optionally filtered by entity
   */
  static async getTransactionHistory({
    userId,
    entityId,
    limit = 20,
    lastKey,
  }: {
    userId: string;
    entityId?: string;
    limit?: number;
    lastKey?: Record<string, any>;
  }): Promise<{ items: any[]; lastKey: any }> {
    try {
      let query = CurrencyTransaction.query("userId").eq(userId);

      if (entityId) {
        query = query
          .using("entityTimestampIndex")
          .where("entityId")
          .eq(entityId);
      }

      query = query.sort("descending").limit(limit);

      if (lastKey) {
        query = query.startAt(lastKey);
      }

      const result = await query.exec();
      return {
        items: result,
        lastKey: result.lastKey,
      };
    } catch (err: any) {
      log.error("Failed to get transaction history", {
        err: err.message,
        userId,
      });
      return { items: [], lastKey: undefined };
    }
  }

  /**
   * Get GLOBAL transaction history for a user (TC Coins)
   */
  static async getGlobalTransactionHistory({
    thricoId,
    limit = 20,
    lastKey,
  }: {
    thricoId: string;
    limit?: number;
    lastKey?: Record<string, any>;
  }): Promise<{ items: any[]; lastKey: any }> {
    try {
      let query = GlobalCurrencyTransaction.query("thricoId").eq(thricoId);

      query = query.sort("descending").limit(limit);

      if (lastKey) {
        query = query.startAt(lastKey);
      }

      const result = await query.exec();
      return {
        items: result,
        lastKey: result.lastKey,
      };
    } catch (err: any) {
      log.error("Failed to get global transaction history", {
        err: err.message,
        thricoId,
      });
      return { items: [], lastKey: undefined };
    }
  }

  /**
   * Log a redemption event to DynamoDB
   */
  static async logRedemption({
    userId,
    entityId,
    rewardId,
    ecUsed,
    tcUsed,
    totalCost,
    status,
    metadata,
  }: {
    userId: string;
    entityId: string;
    rewardId?: string;
    ecUsed: number;
    tcUsed: number;
    totalCost: number;
    status: RedemptionStatus;
    metadata?: Record<string, any>;
  }) {
    try {
      const redemptionId = `${Date.now()}-${uuidv4().slice(0, 8)}`;
      await RedemptionHistory.create({
        userId,
        redemptionId,
        entityId,
        rewardId: rewardId || "",
        ecUsed,
        tcUsed,
        totalCost,
        status,
        metadata: metadata || {},
        timestamp: Date.now(),
      });
      log.info("Redemption logged", {
        userId,
        entityId,
        redemptionId,
        ecUsed,
        tcUsed,
      });
      return redemptionId;
    } catch (err: any) {
      log.error("Failed to log redemption", {
        err: err.message,
        userId,
        entityId,
      });
    }
  }

  /**
   * Get redemption history for a user
   */
  static async getRedemptionHistory({
    userId,
    entityId,
    limit = 20,
    lastKey,
  }: {
    userId: string;
    entityId?: string;
    limit?: number;
    lastKey?: Record<string, any>;
  }): Promise<{ items: any[]; lastKey: any }> {
    try {
      let query = RedemptionHistory.query("userId").eq(userId);

      if (entityId) {
        query = query
          .using("entityTimestampIndex")
          .where("entityId")
          .eq(entityId);
      }

      query = query.sort("descending").limit(limit);

      if (lastKey) {
        query = query.startAt(lastKey);
      }

      const result = await query.exec();
      return {
        items: result,
        lastKey: result.lastKey,
      };
    } catch (err: any) {
      log.error("Failed to get redemption history", {
        err: err.message,
        userId,
      });
      return { items: [], lastKey: undefined };
    }
  }
}
