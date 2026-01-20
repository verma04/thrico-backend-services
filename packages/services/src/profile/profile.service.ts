import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, or, sql } from "drizzle-orm";
import {
  user,
  userProfile,
  userToEntity,
  connections,
  userFollows,
} from "@thrico/database";

export class ProfileService {
  static async getProfileDetails({
    db,
    userId,
    entityId,
    id,
  }: {
    db: any;
    userId: string;
    entityId: string;
    id: string;
  }) {
    try {
      if (!userId || !entityId || !id) {
        throw new GraphQLError(
          "User ID, Entity ID, and Profile ID are required.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      log.debug("Getting profile details", { userId, entityId, profileId: id });

      const profile = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: {
          about: true,
          profile: true,
        },
      });

      if (!profile?.profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Get connections count
      const [connectionsCount] = await db
        .select({
          count: sql<number>`count(*)`.as("count"),
        })
        .from(connections)
        .where(
          and(
            eq(connections.entity, entityId),
            eq(connections.connectionStatusEnum, "ACCEPTED"),
            or(eq(connections.user1, id), eq(connections.user2, id))
          )
        );

      log.debug("Connections count retrieved", {
        profileId: id,
        count: connectionsCount?.count,
      });

      // Get 5 connection images
      const connectionImages = await db
        .select({
          id: userToEntity.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        })
        .from(connections)
        .innerJoin(
          userToEntity,
          or(
            and(
              eq(connections.user1, id),
              eq(connections.user2, userToEntity.id)
            ),
            and(
              eq(connections.user2, id),
              eq(connections.user1, userToEntity.id)
            )
          )
        )
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .where(
          and(
            eq(connections.entity, entityId),
            eq(connections.connectionStatusEnum, "ACCEPTED")
          )
        )
        .limit(5);

      // Get followers count
      const [followersCount] = await db
        .select({
          count: sql<number>`count(*)`.as("count"),
        })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followingId, profile.id),
            eq(userFollows.entityId, entityId)
          )
        );

      // Get following count
      const [followingCount] = await db
        .select({
          count: sql<number>`count(*)`.as("count"),
        })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, profile.id),
            eq(userFollows.entityId, entityId)
          )
        );

      const {
        experience,
        education,
        skills,
        interests,
        socialLinks,
        interestsCategories,
      } = profile.profile;

      const result = {
        experience,
        education,
        skills,
        interests,
        socialLinks,
        interestsCategories,
        connections: {
          count: Number(connectionsCount?.count || 0),
          friends: connectionImages,
        },
        followers: Number(followersCount?.count || 0),
        following: Number(followingCount?.count || 0),
      };

      log.info("Profile details retrieved", {
        userId,
        profileId: id,
        connectionsCount: result.connections.count,
        followersCount: result.followers,
        followingCount: result.following,
      });

      return result;
    } catch (error) {
      log.error("Error in getProfileDetails", {
        error,
        userId,
        entityId,
        profileId: id,
      });
      throw error;
    }
  }

  static async getProfileDetailsInfo({
    db,
    userId,
  }: {
    db: any;
    userId: string;
  }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting profile details info", { userId });

      const profile = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: {
          about: true,
          profile: true,
        },
      });

      if (!profile?.profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const {
        experience,
        education,
        skills,
        interests,
        socialLinks,
        interestsCategories,
      } = profile.profile;

      log.info("Profile details info retrieved", { userId });

      return {
        experience,
        education,
        skills,
        interests,
        socialLinks,
        interestsCategories,
      };
    } catch (error) {
      log.error("Error in getProfileDetailsInfo", { error, userId });
      throw error;
    }
  }

  static async getExperience({ db, userId }: { db: any; userId: string }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user experience", { userId });

      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("User experience retrieved", {
        userId,
        experienceCount: profile.experience?.length || 0,
      });
      return profile.experience;
    } catch (error) {
      log.error("Error in getExperience", { error, userId });
      throw error;
    }
  }

  static async updateExperience({
    db,
    userId,
    experienceData,
  }: {
    db: any;
    userId: string;
    experienceData: any;
  }) {
    try {
      if (!userId || !experienceData) {
        throw new GraphQLError("User ID and experience data are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating user experience", { userId });

      const result = await db
        .update(userProfile)
        .set({ experience: experienceData })
        .where(eq(userProfile.userId, userId))
        .returning();

      if (!result || result.length === 0) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("User experience updated", { userId });
      return result[0];
    } catch (error) {
      log.error("Error in updateExperience", { error, userId });
      throw error;
    }
  }

  static async updateEducation({
    db,
    userId,
    educationData,
  }: {
    db: any;
    userId: string;
    educationData: any;
  }) {
    try {
      if (!userId || !educationData) {
        throw new GraphQLError("User ID and education data are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating user education", { userId });

      const result = await db
        .update(userProfile)
        .set({ education: educationData })
        .where(eq(userProfile.userId, userId))
        .returning();

      if (!result || result.length === 0) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("User education updated", { userId });
      return result[0];
    } catch (error) {
      log.error("Error in updateEducation", { error, userId });
      throw error;
    }
  }

  static async updateSkills({
    db,
    userId,
    skillsData,
  }: {
    db: any;
    userId: string;
    skillsData: any;
  }) {
    try {
      if (!userId || !skillsData) {
        throw new GraphQLError("User ID and skills data are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating user skills", { userId });

      const result = await db
        .update(userProfile)
        .set({ skills: skillsData })
        .where(eq(userProfile.userId, userId))
        .returning();

      if (!result || result.length === 0) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("User skills updated", { userId });
      return result[0];
    } catch (error) {
      log.error("Error in updateSkills", { error, userId });
      throw error;
    }
  }
}
