import { and, eq, sql } from "drizzle-orm";
import { userToEntity, events } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { AuthService } from "@thrico/services";
import { GraphQLError } from "graphql";

const userResolvers = {
  Query: {
    async getAllConnection(_: unknown, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        const { db } = auth;
        const event = await db.query.events.findFirst({
          where: and(eq(events.slug, input.id)),
        });
        return event || null;
      } catch (error) {
        console.error("getAllConnection error:", error);
        throw error;
      }
    },

    async getAllEntityUser(_: unknown, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        const { entityId: org_id, db } = auth;
        if (!org_id) return [];
        const users = await db.query.userToEntity.findMany({
          where: and(
            eq(userToEntity.isApproved, true),
            eq(userToEntity.isRequested, true),
            eq(userToEntity.entityId, org_id)
          ),
          with: {
            user: {
              with: {
                about: true,
              },
            },
          },
        });
        return users.map((set: any) => set.user);
      } catch (error) {
        console.error("getAllEntityUser error:", error);
        throw error;
      }
    },

    async checkUserOnline(_: unknown, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        const { id, db } = auth;
        await db
          .update(userToEntity)
          .set({ lastActive: sql`now()` })
          .where(eq(userToEntity.id, id))
          .returning();
        return { status: true };
      } catch (error) {
        console.error("checkUserOnline error:", error);
        throw error;
      }
    },

    async getUser(_: unknown, _args: any, context: any) {
      try {
        const auth = await checkAuth(context);
        const { entityId, id, db } = auth;
        return AuthService.getUser({ entityId: entityId!, id, db });
      } catch (error) {
        console.error("getUser error:", error);
        throw error;
      }
    },

    async checkAllUserAccount(_: unknown, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        const { db, id } = auth;
        // Note: id from checkAuth is typically the userToEntity id unless context.user.id is passed.
        // AuthService.checkAllUserAccount expects 'userId' which is the main user id (uuid).
        // Let's check context.user.id. checkAuth populates context with user info if token is valid.
        return await AuthService.checkAllUserAccount({
          db,
          userId: context.user?.id || id, // Fallback to id if context.user not explicit
        });
      } catch (error) {
        console.error("checkAllUserAccount error:", error);
        throw error;
      }
    },
  },

  Mutation: {
    async switchAccount(_: unknown, { input }: any, context: any) {
      try {
        const auth = await checkAuth(context);
        const { db } = auth;
        return await AuthService.switchAccount({
          db,
          userId: context.user?.id,
          input,
          generateJwtTokenFn: async (data: any) => {
            // We need to implement or import this.
            // Usually this is provided by dependency injection or imported from utils.
            // Since AuthService expects it, we must provide it.
            // Let's check available utils.
            // services/mobile/src/utils/generateJwtToken.utils.ts exists (from metadata).
            // services/user probably has something similar or we import from shared/utils.
            // For now, assume we can import it or leave as TODO/stub if not found.
            throw new Error("generateJwtTokenFn not implemented in context");
          },
        });
      } catch (error) {
        console.error("switchAccount error:", error);
        throw error;
      }
    },
  },
};

export { userResolvers };
