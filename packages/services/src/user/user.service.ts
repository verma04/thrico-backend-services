import { eq, and, sql } from "drizzle-orm";
import {
  userToEntity,
  userProfile,
  aboutUser,
  user,
  gamificationUser,
} from "@thrico/database";

import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { GamificationEventService } from "../gamification/gamification-event.service";

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
  static async requestAccountDeletion({
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

      log.debug("Requesting account deletion", { userId });

      await db
        .update(user)
        .set({
          isDeletionPending: true,
          deletionRequestedAt: new Date(),
        })
        .where(eq(user.id, userId));

      log.info("Account deletion requested", { userId });
      return true;
    } catch (error) {
      log.error("Error in requestAccountDeletion", { error, userId });
      throw error;
    }
  }

  static async restoreAccount({ userId, db }: { userId: string; db: any }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Restoring account", { userId });

      await db
        .update(user)
        .set({
          isDeletionPending: false,
          deletionRequestedAt: null,
        })
        .where(eq(user.id, userId));

      log.info("Account restored", { userId });
      return true;
    } catch (error) {
      log.error("Error in restoreAccount", { error, userId });
      throw error;
    }
  }

  static async deactivateAccount({ userId, db }: { userId: string; db: any }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Deactivating account", { userId });

      await db
        .update(user)
        .set({
          isActive: false,
        })
        .where(eq(user.id, userId));

      log.info("Account deactivated", { userId });
      return true;
    } catch (error) {
      log.error("Error in deactivateAccount", { error, userId });
      throw error;
    }
  }

  static async reactivateAccount({ userId, db }: { userId: string; db: any }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Reactivating account", { userId });

      await db
        .update(user)
        .set({
          isActive: true,
        })
        .where(eq(user.id, userId));

      log.info("Account reactivated", { userId });
      return true;
    } catch (error) {
      log.error("Error in reactivateAccount", { error, userId });
      throw error;
    }
  }

  static async getReferralCode({ userId, db }: { userId: string; db: any }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting or creating referral code", { userId });

      const userRecord = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { referralCode: true, firstName: true },
      });

      if (!userRecord) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (userRecord.referralCode) {
        return userRecord.referralCode;
      }

      // Generate new referral code
      const firstNamePrefix = (userRecord.firstName || "USER")
        .substring(0, 4)
        .toUpperCase();
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const newReferralCode = `${firstNamePrefix}-${randomSuffix}`;

      await db
        .update(user)
        .set({ referralCode: newReferralCode })
        .where(eq(user.id, userId));

      log.info("Referral code created", { userId, code: newReferralCode });

      return newReferralCode;
    } catch (error) {
      log.error("Error in getReferralCode", { error, userId });
      throw error;
    }
  }

  static async processReferral({
    referredByCode,
    newUserId,
    entityId,
    db,
  }: {
    referredByCode: string;
    newUserId: string;
    entityId: string;
    db: any;
  }) {
    try {
      if (!referredByCode) return;

      log.debug("Processing referral", { referredByCode, newUserId, entityId });

      // Find referrer in the same entity
      const referrer = await db.query.user.findFirst({
        where: and(
          eq(user.referralCode, referredByCode),
          eq(user.entityId, entityId),
        ),
      });

      if (referrer) {
        log.info("Referrer found, triggering gamification event", {
          referrerId: referrer.id,
          newUserId,
        });

        // Trigger event for referrer
        await GamificationEventService.triggerEvent({
          triggerId: "tr-user-refer",
          moduleId: "invite",
          userId: referrer.id,
          entityId,
          referenceId: newUserId,
        });

        // Trigger event for referee (optional, but good for "Double Rewards")
        await GamificationEventService.triggerEvent({
          triggerId: "tr-user-referred-join",
          moduleId: "invite",
          userId: newUserId,
          entityId,
          referenceId: referrer.id,
        });
      } else {
        log.warn("Referrer not found for code", { referredByCode, entityId });
      }
    } catch (error) {
      log.error("Error in processReferral", { error, referredByCode });
      // Don't throw error to avoid breaking the signup flow
    }
  }

  static async getReferralStats({ userId, db }: { userId: string; db: any }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting referral stats", { userId });

      // 1. Get user record to get referral code and entity context
      const userRecord = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { referralCode: true, entityId: true },
      });

      if (!userRecord) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Ensure referral code exists, if not generate it
      const code =
        userRecord.referralCode || (await this.getReferralCode({ userId, db }));

      // 2. Fetch referred users in this entity
      const referredUsers = await db.query.user.findMany({
        where: and(
          eq(user.referredBy, code),
          eq(user.entityId, userRecord.entityId),
        ),
        with: {
          about: true,
          profile: true,
          userEntity: true,
        },
      });

      // 3. Map to entityUser format
      const mappedUsers = referredUsers.map((u: any) => ({
        ...u,
        id: u.userEntity?.id || u.id, // Prefer user_to_entity ID if available
        status: u.userEntity?.status,
        isApproved: u.userEntity?.isApproved,
        isRequested: u.userEntity?.isRequested,
      }));

      log.info("Referral stats retrieved", {
        userId,
        totalReferrals: mappedUsers.length,
      });

      return {
        referralCode: code,
        totalReferrals: mappedUsers.length,
        referredUsers: mappedUsers,
      };
    } catch (error) {
      log.error("Error in getReferralStats", { error, userId });
      throw error;
    }
  }

  static async checkReferralCode({
    code,
    entityId,
    db,
  }: {
    code: string;
    entityId: string;
    db: any;
  }) {
    try {
      if (!code || !entityId) {
        return { isValid: false };
      }

      log.debug("Checking referral code", { code, entityId });

      const referrer = await db.query.user.findFirst({
        where: and(eq(user.referralCode, code), eq(user.entityId, entityId)),
        columns: { firstName: true, lastName: true },
      });

      if (referrer) {
        return {
          isValid: true,
          referrerName: `${referrer.firstName} ${referrer.lastName}`.trim(),
        };
      }

      return { isValid: false };
    } catch (error) {
      log.error("Error in checkReferralCode", { error, code });
      return { isValid: false };
    }
  }
}
