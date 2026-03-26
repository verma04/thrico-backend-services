import { eq } from "drizzle-orm";
import { eventsPromoCodes } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { formatDateInput } from "../../utils/date.utils";

const promoCodeResolvers = {
  Query: {
    async getEventPromoCodes(_: any, { eventId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const promoCodes = await db.query.eventsPromoCodes.findMany({
          where: (promo: any, { eq }: any) => eq(promo.eventId, eventId),
          orderBy: (promo: any, { asc }: any) => asc(promo.createdAt),
        });
        return promoCodes;
      } catch (error) {
        console.log("Error fetching promo codes:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async addEventPromoCode(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        const [promo] = await db
          .insert(eventsPromoCodes)
          .values({
            eventId: input.eventId,
            code: input.code,
            discountType: input.discountType,
            discountValue: input.discountValue?.toString(),
            usageLimit: input.usageLimit,
            expiryDate: formatDateInput(input.expiryDate) as any,
            applicableTickets: input.applicableTickets,
          })
          .returning();
        return promo;
      } catch (error) {
        console.log("Error adding promo code:", error);
        throw error;
      }
    },
    async updateEventPromoCode(
      _: any,
      { promoCodeId, input }: any,
      context: any,
    ) {
      try {
        const { db } = await checkAuth(context);
        const [promo] = await db
          .update(eventsPromoCodes)
          .set({
            code: input.code,
            discountType: input.discountType,
            discountValue: input.discountValue?.toString(),
            usageLimit: input.usageLimit,
            expiryDate: formatDateInput(input.expiryDate) as any,
            applicableTickets: input.applicableTickets,
            updatedAt: new Date(),
          })
          .where(eq(eventsPromoCodes.id, promoCodeId))
          .returning();
        return promo;
      } catch (error) {
        console.log("Error updating promo code:", error);
        throw error;
      }
    },
    async deleteEventPromoCode(_: any, { promoCodeId }: any, context: any) {
      try {
        const { db } = await checkAuth(context);
        await db
          .delete(eventsPromoCodes)
          .where(eq(eventsPromoCodes.id, promoCodeId));
        return true;
      } catch (error) {
        console.log("Error deleting promo code:", error);
        throw error;
      }
    },
  },
};

export { promoCodeResolvers };
