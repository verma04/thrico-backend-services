import { and, desc, eq, sql, asc } from "drizzle-orm";
import {
  wallOfFame,
  wallOfFameCategory,
  userToEntity,
} from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

const wallOfFameResolvers: any = {
  Query: {
    async getWallOfFame(_: any, { input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);
        const {
          limit = 20,
          offset = 0,
          searchQuery,
          categoryId,
          year,
        } = input || {};

        const filters = [eq(wallOfFame.entityId, entity)];

        if (searchQuery) {
          // Note: In a real app we might join user details to search by name
          // but for now searching by title
          filters.push(sql`${wallOfFame.title} ILIKE ${`%%${searchQuery}%%`}`);
        }

        if (categoryId) {
          filters.push(eq(wallOfFame.categoryId, categoryId));
        }

        if (year) {
          filters.push(eq(wallOfFame.year, year));
        }

        const data = await db.query.wallOfFame.findMany({
          where: and(...filters),
          limit,
          offset,
          orderBy: [asc(wallOfFame.order), desc(wallOfFame.createdAt)],
          with: {
            user: {
              with: {
                user: {
                  with: {
                    about: true,
                    profile: true,
                  },
                },
              },
            },
            category: true,
          },
        });

        return data;
      } catch (error) {
        console.log("Error in getWallOfFame:", error);
        throw error;
      }
    },
    async getWallOfFameById(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const data = await db.query.wallOfFame.findFirst({
          where: and(eq(wallOfFame.id, id), eq(wallOfFame.entityId, entity)),
          with: {
            user: {
              with: {
                user: {
                  with: {
                    about: true,
                    profile: true,
                  },
                },
              },
            },
            category: true,
          },
        });

        if (!data) {
          throw new GraphQLError("Wall of Fame entry not found");
        }

        return data;
      } catch (error) {
        console.log("Error in getWallOfFameById:", error);
        throw error;
      }
    },
    async getWallOfFameCategories(_: any, __: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        return await db.query.wallOfFameCategory.findMany({
          where: eq(wallOfFameCategory.entityId, entity),
          orderBy: [desc(wallOfFameCategory.createdAt)],
        });
      } catch (error) {
        console.log("Error in getWallOfFameCategories:", error);
        throw error;
      }
    },
  },
  Mutation: {
    async addToWallOfFame(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        // Check if user is member
        const memberCheck = await db.query.userToEntity.findFirst({
          where: and(
            eq(userToEntity.id, input.userId),
            eq(userToEntity.entityId, entity),
          ),
        });

        if (!memberCheck) {
          throw new GraphQLError("User is not a member of this entity");
        }

        const [newEntry] = await db
          .insert(wallOfFame)
          .values({
            ...input,
            entityId: entity,
          })
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "WALL_OF_FAME",
          action: "ADD_ENTRY",
          resourceId: newEntry.id,
          targetUserId: memberCheck.userId,
          newState: newEntry,
        });

        return newEntry;
      } catch (error) {
        console.log("Error in addToWallOfFame:", error);
        throw error;
      }
    },
    async updateWallOfFame(_: any, { id, input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        const existing = await db.query.wallOfFame.findFirst({
          where: and(eq(wallOfFame.id, id), eq(wallOfFame.entityId, entity)),
        });

        if (!existing) {
          throw new GraphQLError("Entry not found");
        }

        const [updated] = await db
          .update(wallOfFame)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(and(eq(wallOfFame.id, id), eq(wallOfFame.entityId, entity)))
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "WALL_OF_FAME",
          action: "UPDATE_ENTRY",
          resourceId: id,
          targetUserId: existing.userId,
          previousState: existing,
          newState: updated,
        });

        return updated;
      } catch (error) {
        console.log("Error in updateWallOfFame:", error);
        throw error;
      }
    },
    async removeFromWallOfFame(_: any, { id }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        const [deleted] = await db
          .delete(wallOfFame)
          .where(and(eq(wallOfFame.id, id), eq(wallOfFame.entityId, entity)))
          .returning();

        if (!deleted) {
          throw new GraphQLError("Entry not found");
        }

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "WALL_OF_FAME",
          action: "REMOVE_ENTRY",
          resourceId: id,
          targetUserId: deleted.userId,
        });

        return deleted;
      } catch (error) {
        console.log("Error in removeFromWallOfFame:", error);
        throw error;
      }
    },
    async reorderWallOfFame(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        const updatedEntries = await Promise.all(
          input.map(async ({ id, order }: any) => {
            const [updated] = await db
              .update(wallOfFame)
              .set({ order, updatedAt: new Date() })
              .where(
                and(
                  eq(wallOfFame.id, id),
                  eq(wallOfFame.entityId, entity),
                ),
              )
              .returning();
            return updated;
          }),
        );

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "WALL_OF_FAME",
          action: "REORDER_ENTRIES",
          newState: input,
        });

        return updatedEntries.filter(Boolean);
      } catch (error) {
        console.log("Error in reorderWallOfFame:", error);
        throw error;
      }
    },

    async addWallOfFameCategory(_: any, { input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        const [newCategory] = await db
          .insert(wallOfFameCategory)
          .values({
            ...input,
            entityId: entity,
          })
          .returning();

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "WALL_OF_FAME",
          action: "ADD_CATEGORY",
          resourceId: newCategory.id,
          newState: newCategory,
        });

        return newCategory;
      } catch (error) {
        console.log("Error in addWallOfFameCategory:", error);
        throw error;
      }
    },
    async updateWallOfFameCategory(_: any, { id, input }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        const [updated] = await db
          .update(wallOfFameCategory)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(wallOfFameCategory.id, id),
              eq(wallOfFameCategory.entityId, entity),
            ),
          )
          .returning();

        if (!updated) {
          throw new GraphQLError("Category not found");
        }

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "WALL_OF_FAME",
          action: "UPDATE_CATEGORY",
          resourceId: id,
          newState: updated,
        });

        return updated;
      } catch (error) {
        console.log("Error in updateWallOfFameCategory:", error);
        throw error;
      }
    },
    async deleteWallOfFameCategory(_: any, { id }: any, context: any) {
      try {
        const { db, entity, id: adminId } = await checkAuth(context);

        const [deleted] = await db
          .delete(wallOfFameCategory)
          .where(
            and(
              eq(wallOfFameCategory.id, id),
              eq(wallOfFameCategory.entityId, entity),
            ),
          )
          .returning();

        if (!deleted) {
          throw new GraphQLError("Category not found");
        }

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: "WALL_OF_FAME",
          action: "DELETE_CATEGORY",
          resourceId: id,
        });

        return deleted;
      } catch (error) {
        console.log("Error in deleteWallOfFameCategory:", error);
        throw error;
      }
    },
  },
};

export { wallOfFameResolvers };
