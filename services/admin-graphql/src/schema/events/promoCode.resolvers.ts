import { eq } from "drizzle-orm";
import { eventsPromoCodes } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { formatDateInput } from "../../utils/date.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

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

        const { id: adminId, entity: entityId } = await checkAuth(context);
        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_PROMO_CODE",
          action: "CREATE",
          resourceId: promo.id,
          newState: promo,
        });

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
        const { db, id: adminId, entity: entityId } = await checkAuth(context);
        const existing = await db.query.eventsPromoCodes.findFirst({
          where: eq(eventsPromoCodes.id, promoCodeId),
        });

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

        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_PROMO_CODE",
          action: "UPDATE",
          resourceId: promo.id,
          previousState: existing,
          newState: promo,
        });

        return promo;
      } catch (error) {
        console.log("Error updating promo code:", error);
        throw error;
      }
    },
    async deleteEventPromoCode(_: any, { promoCodeId }: any, context: any) {
      try {
        const { db, id: adminId, entity: entityId } = await checkAuth(context);
        const existing = await db.query.eventsPromoCodes.findFirst({
          where: eq(eventsPromoCodes.id, promoCodeId),
        });

        await db
          .delete(eventsPromoCodes)
          .where(eq(eventsPromoCodes.id, promoCodeId));

        await createAuditLog(db, {
          adminId,
          entityId,
          module: "EVENT_PROMO_CODE",
          action: "DELETE",
          resourceId: promoCodeId,
          previousState: existing,
        });

        return true;
      } catch (error) {
        console.log("Error deleting promo code:", error);
        throw error;
      }
    },
  },
};

export { promoCodeResolvers };
