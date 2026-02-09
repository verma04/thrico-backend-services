import { log } from "@thrico/logging";
import * as crypto from "crypto";
import { GraphQLError } from "graphql";
import { and, eq, or, sql } from "drizzle-orm";
import {
  user,
  userProfile,
  aboutUser,
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
          },
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
        log.info("Profile not found, creating a new one", { userId });
        const [newProfile] = await db
          .insert(userProfile)
          .values({
            userId: userId,
            experience: [],
            education: [],
            skills: [],
            interests: [],
            socialLinks: [],
            interestsCategories: [],
          })
          .returning();
        profile.profile = newProfile;
      }

      if (!profile?.about) {
        log.info("About user not found, creating a new one", { userId });
        const [newAbout] = await db
          .insert(aboutUser)
          .values({
            userId: userId,
            headline: "Community Member",
          })
          .returning();
        profile.about = newAbout;
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
            or(eq(connections.user1, id), eq(connections.user2, id)),
          ),
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
              eq(connections.user2, userToEntity.id),
            ),
            and(
              eq(connections.user2, id),
              eq(connections.user1, userToEntity.id),
            ),
          ),
        )
        .innerJoin(user, eq(userToEntity.userId, user.id))
        .where(
          and(
            eq(connections.entity, entityId),
            eq(connections.connectionStatusEnum, "ACCEPTED"),
          ),
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
            eq(userFollows.entityId, entityId),
          ),
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
            eq(userFollows.entityId, entityId),
          ),
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
        log.info(
          "Profile not found in getProfileDetailsInfo, creating a new one",
          {
            userId,
          },
        );
        const [newProfile] = await db
          .insert(userProfile)
          .values({
            userId: userId,
            experience: [],
            education: [],
            skills: [],
            interests: [],
            socialLinks: [],
            interestsCategories: [],
          })
          .returning();
        profile.profile = newProfile;
      }

      if (!profile?.about) {
        log.info(
          "About user not found in getProfileDetailsInfo, creating a new one",
          {
            userId,
          },
        );
        const [newAbout] = await db
          .insert(aboutUser)
          .values({
            userId: userId,
          })
          .returning();
        profile.about = newAbout;
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

  static async getSkillsItemById({
    db,
    userId,
    itemId,
  }: {
    db: any;
    userId: string;
    itemId: string;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const skills = Array.isArray(profile.skills) ? profile.skills : [];
      const item = skills.find((i: any) => i.id === itemId);

      if (!item) {
        throw new GraphQLError("Skill item not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return item;
    } catch (error) {
      log.error("Error in getSkillsItemById", { error, userId, itemId });
      throw error;
    }
  }

  static async getEducationItemById({
    db,
    userId,
    itemId,
  }: {
    db: any;
    userId: string;
    itemId: string;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile || !profile.education) return null;

      const education = Array.isArray(profile.education)
        ? profile.education
        : [];
      return education.find((item: any) => item.id === itemId) || null;
    } catch (error) {
      log.error("Error in getEducationItemById", { error, userId, itemId });
      throw error;
    }
  }

  static async addEducationItem({
    db,
    userId,
    input,
  }: {
    db: any;
    userId: string;
    input: any;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const education = Array.isArray(profile.education)
        ? [...profile.education]
        : [];

      const newItem = {
        ...input,
        id: input.id || crypto.randomUUID(),
      };

      education.push(newItem);

      const result = await db
        .update(userProfile)
        .set({ education })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].education;
    } catch (error) {
      log.error("Error in addEducationItem", { error, userId });
      throw error;
    }
  }

  static async editEducationItem({
    db,
    userId,
    itemId,
    input,
  }: {
    db: any;
    userId: string;
    itemId: string;
    input: any;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const education = Array.isArray(profile.education)
        ? [...profile.education]
        : [];

      const index = education.findIndex((item: any) => item.id === itemId);
      if (index === -1) {
        throw new GraphQLError("Education item not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      education[index] = {
        ...education[index],
        ...input,
        id: itemId, // Ensure ID doesn't change
      };

      const result = await db
        .update(userProfile)
        .set({ education })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].education;
    } catch (error) {
      log.error("Error in editEducationItem", { error, userId, itemId });
      throw error;
    }
  }

  static async deleteEducationItem({
    db,
    userId,
    itemId,
  }: {
    db: any;
    userId: string;
    itemId: string;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const education = Array.isArray(profile.education)
        ? [...profile.education]
        : [];

      const filteredEducation = education.filter(
        (item: any) => item.id !== itemId,
      );

      const result = await db
        .update(userProfile)
        .set({ education: filteredEducation })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].education;
    } catch (error) {
      log.error("Error in deleteEducationItem", { error, userId, itemId });
      throw error;
    }
  }

  static async getExperienceItemById({
    db,
    userId,
    itemId,
  }: {
    db: any;
    userId: string;
    itemId: string;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile || !profile.experience) return null;

      const experience = Array.isArray(profile.experience)
        ? profile.experience
        : [];
      return experience.find((item: any) => item.id === itemId) || null;
    } catch (error) {
      log.error("Error in getExperienceItemById", { error, userId, itemId });
      throw error;
    }
  }

  static async addExperienceItem({
    db,
    userId,
    input,
  }: {
    db: any;
    userId: string;
    input: any;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const experience = Array.isArray(profile.experience)
        ? [...profile.experience]
        : [];

      const newItem = {
        ...input,
        id: input.id || crypto.randomUUID(),
      };

      experience.push(newItem);

      const result = await db
        .update(userProfile)
        .set({ experience })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].experience;
    } catch (error) {
      log.error("Error in addExperienceItem", { error, userId });
      throw error;
    }
  }

  static async editExperienceItem({
    db,
    userId,
    itemId,
    input,
  }: {
    db: any;
    userId: string;
    itemId: string;
    input: any;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const experience = Array.isArray(profile.experience)
        ? [...profile.experience]
        : [];

      const index = experience.findIndex((item: any) => item.id === itemId);
      if (index === -1) {
        throw new GraphQLError("Experience item not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      experience[index] = {
        ...experience[index],
        ...input,
        id: itemId, // Ensure ID doesn't change
      };

      const result = await db
        .update(userProfile)
        .set({ experience })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].experience;
    } catch (error) {
      log.error("Error in editExperienceItem", { error, userId, itemId });
      throw error;
    }
  }

  static async deleteExperienceItem({
    db,
    userId,
    itemId,
  }: {
    db: any;
    userId: string;
    itemId: string;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const experience = Array.isArray(profile.experience)
        ? [...profile.experience]
        : [];

      const filteredExperience = experience.filter(
        (item: any) => item.id !== itemId,
      );

      const result = await db
        .update(userProfile)
        .set({ experience: filteredExperience })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].experience;
    } catch (error) {
      log.error("Error in deleteExperienceItem", { error, userId, itemId });
      throw error;
    }
  }

  static async addSkillsItem({
    db,
    userId,
    input,
  }: {
    db: any;
    userId: string;
    input: any;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const skills = Array.isArray(profile.skills) ? [...profile.skills] : [];

      const newItem = {
        ...input,
        id: input.id || crypto.randomUUID(),
      };

      skills.push(newItem);

      const result = await db
        .update(userProfile)
        .set({ skills })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].skills;
    } catch (error) {
      log.error("Error in addSkillsItem", { error, userId });
      throw error;
    }
  }

  static async editSkillsItem({
    db,
    userId,
    itemId,
    input,
  }: {
    db: any;
    userId: string;
    itemId: string;
    input: any;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const skills = Array.isArray(profile.skills) ? [...profile.skills] : [];

      const index = skills.findIndex((item: any) => item.id === itemId);
      if (index === -1) {
        throw new GraphQLError("Skill item not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      skills[index] = {
        ...skills[index],
        ...input,
        id: itemId, // Ensure ID doesn't change
      };

      const result = await db
        .update(userProfile)
        .set({ skills })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].skills;
    } catch (error) {
      log.error("Error in editSkillsItem", { error, userId, itemId });
      throw error;
    }
  }

  static async deleteSkillsItem({
    db,
    userId,
    itemId,
  }: {
    db: any;
    userId: string;
    itemId: string;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const skills = Array.isArray(profile.skills) ? [...profile.skills] : [];

      const filteredSkills = skills.filter((item: any) => item.id !== itemId);

      const result = await db
        .update(userProfile)
        .set({ skills: filteredSkills })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].skills;
    } catch (error) {
      log.error("Error in deleteSkillsItem", { error, userId, itemId });
      throw error;
    }
  }

  static async getSocialLinkById({
    db,
    userId,
    itemId,
  }: {
    db: any;
    userId: string;
    itemId: string;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const socialLinks = Array.isArray(profile.socialLinks)
        ? profile.socialLinks
        : [];
      const item = socialLinks.find((i: any) => i.id === itemId);

      if (!item) {
        throw new GraphQLError("Social link not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return item;
    } catch (error) {
      log.error("Error in getSocialLinkById", { error, userId, itemId });
      throw error;
    }
  }

  static async addSocialLinksItem({
    db,
    userId,
    input,
  }: {
    db: any;
    userId: string;
    input: any;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const socialLinks = Array.isArray(profile.socialLinks)
        ? [...profile.socialLinks]
        : [];

      const newItem = {
        ...input,
        id: input.id || crypto.randomUUID(),
      };

      socialLinks.push(newItem);

      const result = await db
        .update(userProfile)
        .set({ socialLinks })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].socialLinks;
    } catch (error) {
      log.error("Error in addSocialLinksItem", { error, userId });
      throw error;
    }
  }

  static async editSocialLinksItem({
    db,
    userId,
    itemId,
    input,
  }: {
    db: any;
    userId: string;
    itemId: string;
    input: any;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const socialLinks = Array.isArray(profile.socialLinks)
        ? [...profile.socialLinks]
        : [];

      const index = socialLinks.findIndex((item: any) => item.id === itemId);
      if (index === -1) {
        throw new GraphQLError("Social link not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      socialLinks[index] = {
        ...socialLinks[index],
        ...input,
        id: itemId,
      };

      const result = await db
        .update(userProfile)
        .set({ socialLinks })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].socialLinks;
    } catch (error) {
      log.error("Error in editSocialLinksItem", { error, userId, itemId });
      throw error;
    }
  }

  static async deleteSocialLinksItem({
    db,
    userId,
    itemId,
  }: {
    db: any;
    userId: string;
    itemId: string;
  }) {
    try {
      const profile = await db.query.userProfile.findFirst({
        where: eq(userProfile.userId, userId),
      });

      if (!profile) {
        throw new GraphQLError("Profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const socialLinks = Array.isArray(profile.socialLinks)
        ? [...profile.socialLinks]
        : [];

      const filteredLinks = socialLinks.filter(
        (item: any) => item.id !== itemId,
      );

      const result = await db
        .update(userProfile)
        .set({ socialLinks: filteredLinks })
        .where(eq(userProfile.userId, userId))
        .returning();

      return result[0].socialLinks;
    } catch (error) {
      log.error("Error in deleteSocialLinksItem", { error, userId, itemId });
      throw error;
    }
  }
}
