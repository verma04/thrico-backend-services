import { entityCurrencyWallet } from "@thrico/database";
import { eq, and, sql } from "drizzle-orm";
import { log } from "@thrico/logging";

export class EntityCurrencyWalletService {
  /**
   * Get or create an entity currency wallet for a user
   */
  static async getOrCreateWallet({
    userId,
    entityId,
    db,
  }: {
    userId: string;
    entityId: string;
    db: any;
  }) {
    let wallet = await db.query.entityCurrencyWallet.findFirst({
      where: and(
        eq(entityCurrencyWallet.userId, userId),
        eq(entityCurrencyWallet.entityId, entityId),
      ),
    });

    if (!wallet) {
      const [created] = await db
        .insert(entityCurrencyWallet)
        .values({ userId, entityId })
        .onConflictDoNothing()
        .returning();

      wallet =
        created ||
        (await db.query.entityCurrencyWallet.findFirst({
          where: and(
            eq(entityCurrencyWallet.userId, userId),
            eq(entityCurrencyWallet.entityId, entityId),
          ),
        }));
    }

    return wallet;
  }

  /**
   * Credit entity currency to a user's wallet
   */
  static async creditEC({
    userId,
    entityId,
    amount,
    db,
  }: {
    userId: string;
    entityId: string;
    amount: number;
    db: any;
  }) {
    const wallet = await this.getOrCreateWallet({ userId, entityId, db });
    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore + amount;

    await db
      .update(entityCurrencyWallet)
      .set({
        balance: sql`${entityCurrencyWallet.balance} + ${amount}`,
        totalEarned: sql`${entityCurrencyWallet.totalEarned} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(entityCurrencyWallet.id, wallet.id));

    log.info("EC credited", {
      userId,
      entityId,
      amount,
      balanceBefore,
      balanceAfter,
    });

    return { balanceBefore, balanceAfter, walletId: wallet.id };
  }

  /**
   * Debit entity currency from a user's wallet
   */
  static async debitEC({
    userId,
    entityId,
    amount,
    db,
  }: {
    userId: string;
    entityId: string;
    amount: number;
    db: any;
  }) {
    const wallet = await this.getOrCreateWallet({ userId, entityId, db });
    const balanceBefore = Number(wallet.balance);

    if (balanceBefore < amount) {
      throw new Error(
        `Insufficient EC balance. Have: ${balanceBefore}, Need: ${amount}`,
      );
    }

    const balanceAfter = balanceBefore - amount;

    await db
      .update(entityCurrencyWallet)
      .set({
        balance: sql`${entityCurrencyWallet.balance} - ${amount}`,
        totalSpent: sql`${entityCurrencyWallet.totalSpent} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(entityCurrencyWallet.id, wallet.id));

    log.info("EC debited", {
      userId,
      entityId,
      amount,
      balanceBefore,
      balanceAfter,
    });

    return { balanceBefore, balanceAfter, walletId: wallet.id };
  }

  /**
   * Record EC converted to TC on the entity wallet
   */
  static async recordTCConversion({
    userId,
    entityId,
    ecAmount,
    db,
  }: {
    userId: string;
    entityId: string;
    ecAmount: number;
    db: any;
  }) {
    const wallet = await this.getOrCreateWallet({ userId, entityId, db });

    await db
      .update(entityCurrencyWallet)
      .set({
        totalConvertedToTc: sql`${entityCurrencyWallet.totalConvertedToTc} + ${ecAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(entityCurrencyWallet.id, wallet.id));
  }

  /**
   * Get all entity wallets for a user
   */
  static async getAllWallets({ userId, db }: { userId: string; db: any }) {
    return db.query.entityCurrencyWallet.findMany({
      where: eq(entityCurrencyWallet.userId, userId),
    });
  }

  /**
   * Get a specific entity wallet
   */
  static async getWallet({
    userId,
    entityId,
    db,
  }: {
    userId: string;
    entityId: string;
    db: any;
  }) {
    return db.query.entityCurrencyWallet.findFirst({
      where: and(
        eq(entityCurrencyWallet.userId, userId),
        eq(entityCurrencyWallet.entityId, entityId),
      ),
    });
  }
}
