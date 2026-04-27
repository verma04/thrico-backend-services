import { tcCoinWallet } from "@thrico/database";
import { eq, sql, and } from "drizzle-orm";
import { log } from "@thrico/logging";

export class GlobalWalletService {
  /**
   * Get or create the global TC Coin wallet for a user
   */
  static async getOrCreateWallet({
    thricoId,
    db,
  }: {
    thricoId: string;
    db: any;
  }) {
    try {
      let wallet = await db.query.tcCoinWallet.findFirst({
        where: eq(tcCoinWallet.thricoId, thricoId),
      });

      if (!wallet) {
        const [created] = await db
          .insert(tcCoinWallet)
          .values({ thricoId })
          .onConflictDoNothing()
          .returning();

        wallet =
          created ||
          (await db.query.tcCoinWallet.findFirst({
            where: eq(tcCoinWallet.thricoId, thricoId),
          }));
      }

      return wallet;
    } catch (error) {
      log.error("Error in getOrCreateWallet", { error, thricoId });
      throw error;
    }
  }

  /**
   * Credit TC Coins to a user's global wallet
   */
  static async creditTC({
    thricoId,
    amount,
    db,
  }: {
    thricoId: string;
    amount: number;
    db: any;
  }) {
    try {
      const wallet = await this.getOrCreateWallet({ thricoId, db });
      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      await db
        .update(tcCoinWallet)
        .set({
          balance: sql`${tcCoinWallet.balance} + ${amount}`,
          totalEarned: sql`${tcCoinWallet.totalEarned} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(tcCoinWallet.id, wallet.id));

      log.info("TC credited", {
        thricoId,
        amount,
        balanceBefore,
        balanceAfter,
      });

      return { balanceBefore, balanceAfter, walletId: wallet.id };
    } catch (error) {
      log.error("Error in creditTC", { error, thricoId, amount });
      throw error;
    }
  }

  /**
   * Debit TC Coins from a user's global wallet
   */
  static async debitTC({
    thricoId,
    amount,
    db,
  }: {
    thricoId: string;
    amount: number;
    db: any;
  }) {
    try {
      const wallet = await this.getOrCreateWallet({ thricoId, db });
      const balanceBefore = Number(wallet.balance);

      if (balanceBefore < amount) {
        throw new Error(
          `Insufficient TC balance. Have: ${balanceBefore}, Need: ${amount}`,
        );
      }

    const [updatedWallet] = await db
      .update(tcCoinWallet)
      .set({
        balance: sql`${tcCoinWallet.balance} - ${amount}`,
        totalSpent: sql`${tcCoinWallet.totalSpent} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tcCoinWallet.id, wallet.id),
          sql`${tcCoinWallet.balance} >= ${amount}`,
        ),
      )
      .returning();

    if (!updatedWallet) {
      throw new Error(
        `Insufficient TC balance or transaction race condition. Have: ${balanceBefore}, Need: ${amount}`,
      );
    }

    const balanceAfter = Number(updatedWallet.balance);

      log.info("TC debited", { thricoId, amount, balanceBefore, balanceAfter });

      return { balanceBefore, balanceAfter, walletId: wallet.id };
    } catch (error) {
      log.error("Error in debitTC", { error, thricoId, amount });
      throw error;
    }
  }

  /**
   * Get the global TC wallet for a user
   */
  static async getWallet({ thricoId, db }: { thricoId: string; db: any }) {
    try {
      return await db.query.tcCoinWallet.findFirst({
        where: eq(tcCoinWallet.thricoId, thricoId),
      });
    } catch (error) {
      log.error("Error in getWallet", { error, thricoId });
      throw error;
    }
  }
}
