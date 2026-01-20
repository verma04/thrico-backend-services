import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { entity, userToEntity } from "@thrico/database";
import { and, eq } from "drizzle-orm";

export class UserService {
  static async getUserOrgDetails({
    entityId,
    db,
  }: {
    entityId: string;
    db: any;
  }) {
    try {
      if (!entityId) {
        throw new GraphQLError("Entity ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user org details", { entityId });

      const entityRecord = await db.query.entity.findFirst({
        where: (e: any, { eq }: any) => eq(e.id, entityId),
      });

      if (!entityRecord) {
        throw new GraphQLError("Entity not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const orgData = {
        name: entityRecord?.name,
        logo: `https://cdn.thrico.network/${entityRecord.logo}`,
      };

      log.info("User org details retrieved", { entityId, name: orgData.name });
      return orgData;
    } catch (error) {
      log.error("Error in getUserOrgDetails", { error, entityId });
      throw error;
    }
  }

  static async getUserDetails({ userId, db }: { userId: string; db: any }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user details", { userId });

      const user = await db.query.userToEntity.findFirst({
        where: (userToEntity: any, { eq }: any) => eq(userToEntity.id, userId),
        with: {
          user: true,
        },
      });

      if (!user) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const userData = {
        email: user?.user.email,
        firstName: user?.user.firstName,
        lastName: user?.user.lastName,
      };

      log.info("User details retrieved", { userId, email: userData.email });
      return userData;
    } catch (error) {
      log.error("Error in getUserDetails", { error, userId });
      throw error;
    }
  }

  static async getCommunitiesSettings({
    entityId,
    db,
  }: {
    entityId: string;
    db: any;
  }) {
    try {
      if (!entityId) {
        throw new GraphQLError("Entity ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting communities settings", { entityId });

      const settings = await db.query.entitySettingsGroups.findFirst({
        where: (entitySettingsGroups: any, { eq }: any) =>
          eq(entitySettingsGroups.entity, entityId),
      });

      log.info("Communities settings retrieved", { entityId });
      return settings;
    } catch (error) {
      log.error("Error in getCommunitiesSettings", { error, entityId });
      throw error;
    }
  }
}
