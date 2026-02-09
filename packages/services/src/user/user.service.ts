import { eq, and, sql } from "drizzle-orm";
import { userToEntity, userProfile, aboutUser, user } from "@thrico/database";
import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";

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

      const user = await db.query.user.findFirst({
        where: (user: any, { eq }: any) => eq(user.id, userId),
      });

      if (!user) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const userData = {
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
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

  static async updateOnlineStatus({
    userId,
    entityId,
    db,
  }: {
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating online status", { userId, entityId });

      await db
        .update(userToEntity)
        .set({
          isOnline: true,
          lastActive: new Date().toISOString(),
        })
        .where(
          and(eq(userToEntity.id, userId), eq(userToEntity.entityId, entityId)),
        );

      log.info("Online status updated", { userId });
      return true;
    } catch (error) {
      log.error("Error in updateOnlineStatus", { error, userId, entityId });
      throw error;
    }
  }

  static async getOnlineConnections({
    userId,
    entityId,
    db,
    limit = 10,
    offset = 0,
  }: {
    userId: string;
    entityId: string;
    db: any;
    limit?: number;
    offset?: number;
  }) {
    try {
      if (!userId || !entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting online connections", { userId, entityId });

      // 1. Fetch online connections using a direct query for efficiency
      const onlineConnections = await db.execute(sql`
        SELECT 
          ute.id,
          u."firstName",
          u."lastName",
          u.avatar
        FROM "userConnections" c
        JOIN "userToEntity" ute ON (
          (c.user_id = ${userId} AND c.user2_id = ute.id) OR
          (c.user2_id = ${userId} AND c.user_id = ute.id)
        )
        JOIN "thricoUser" u ON ute.user_id = u.id
        WHERE c.entity_id = ${entityId}
          AND c."connectionStatusEnum" = 'ACCEPTED'
          AND ute.entity_id = ${entityId}
          AND ute."isOnline" = true
          AND ute.last_active + interval '10 minutes' > now()
        ORDER BY ute.last_active DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      // 2. Get total count for pagination
      const [totalCountResult] = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM "userConnections" c
        JOIN "userToEntity" ute ON (
          (c.user_id = ${userId} AND c.user2_id = ute.id) OR
          (c.user2_id = ${userId} AND c.user_id = ute.id)
        )
        WHERE c.entity_id = ${entityId}
          AND c."connectionStatusEnum" = 'ACCEPTED'
          AND ute.entity_id = ${entityId}
       
      `);

      const totalCount = Number(totalCountResult?.count || 0);

      log.info("Online connections retrieved", {
        userId,
        count: onlineConnections.length,
        totalCount,
      });

      return {
        friends: onlineConnections || [],
        count: totalCount,
      };
    } catch (error) {
      log.error("Error in getOnlineConnections", { error, userId, entityId });
      throw error;
    }
  }

  static async getProfileCompletion({
    userId,
    db,
  }: {
    userId: string;
    db: any;
  }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Calculating profile completion", { userId });

      const profileData = await db
        .select({
          education: userProfile.education,
          experience: userProfile.experience,
          dob: userProfile.DOB,
          skills: userProfile.skills,
          social: userProfile?.socialLinks,
        })
        .from(user)
        .leftJoin(userProfile, eq(userProfile.userId, user.id))
        .leftJoin(aboutUser, eq(aboutUser.userId, user.id))
        .where(eq(user.id, userId))
        .limit(1);

      if (!profileData || profileData.length === 0) {
        throw new GraphQLError("User profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const data = profileData[0];
      const pendingFields: string[] = [];
      let completedCount = 0;
      const totalFields = 5;

      // 1. Education
      if (Array.isArray(data.education) && data.education.length > 0) {
        completedCount++;
      } else {
        pendingFields.push("Education");
      }

      // 2. Experience
      if (Array.isArray(data.experience) && data.experience.length > 0) {
        completedCount++;
      } else {
        pendingFields.push("Experience");
      }

      // 3. DOB
      if (data.dob && data.dob.trim() !== "") {
        completedCount++;
      } else {
        pendingFields.push("Date of Birth");
      }

      // 4. Skills
      if (Array.isArray(data.skills) && data.skills.length > 0) {
        completedCount++;
      } else {
        pendingFields.push("Skills");
      }

      // 5. Social (About)
      if (
        data.social &&
        ((Array.isArray(data.social) && data.social.length > 0) ||
          (typeof data.social === "object" &&
            Object.keys(data.social).length > 0))
      ) {
        completedCount++;
      } else {
        pendingFields.push("Social Links");
      }

      const percentage = Math.round((completedCount / totalFields) * 100);

      log.info("Profile completion calculated", { userId, percentage });

      return {
        percentage,
        pendingFields,
      };
    } catch (error) {
      log.error("Error in getProfileCompletion", { error, userId });
      throw error;
    }
  }
}
