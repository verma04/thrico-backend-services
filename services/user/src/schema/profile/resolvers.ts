import { and, eq, or, sql } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  NetworkService,
  ProfileService,
  UserService,
  StorageService,
} from "@thrico/services";
import {
  aboutUser,
  user,
  userLocation,
  userProfile,
  userToEntity,
  PAGE,
  type AppDatabase,
  connections,
} from "@thrico/database";
import { log } from "@thrico/logging";

const profileResolvers: any = {
  Query: {
    async getProfileInfo(_: any, { input }: any, context: any) {
      try {
        const { userId, db, entityId, id } = await checkAuth(context);

        const details = await ProfileService.getProfileDetails({
          db,
          userId,
          entityId,
          id,
        });

        log.info(`Fetching profile info for user ${userId}`);

        return details;
      } catch (error) {
        log.error(`Error in getProfileInfo: ${error}`);
        throw error;
      }
    },
    async getPageInfo(_: any, { id }: any, context: any) {
      try {
        await checkAuth(context);

        const page = await PAGE.query("id").eq(id).exec();
        log.info(`Fetching page info for ID ${id}`);

        return page.toJSON()[0];
      } catch (error) {
        log.error(`Error in getPageInfo: ${error}`);
        throw error;
      }
    },

    async getProfileExperience(_: any, __: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const details = await ProfileService.getExperience({ db, userId });

        return details;
      } catch (error) {
        log.error(`Error in getProfileExperience: ${error}`);
        throw error;
      }
    },

    async getUserProfileInfo(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        log.info(`Fetching user profile info for ID ${input?.id}`);

        const details = await ProfileService.getProfileDetailsInfo({
          db,
          userId: input.id,
        });

        return details;
      } catch (error) {
        log.error(`Error in getUserProfileInfo: ${error}`);
        throw error;
      }
    },

    async getUserInterests(_: any, __: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const profile = await db.query.userToEntity.findFirst({
          where: and(eq(userToEntity.userId, userId)),
        });

        return profile?.interests;
      } catch (error) {
        log.error(`Error in getUserInterests: ${error}`);
        throw error;
      }
    },

    async getUserCategories(_: any, __: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const profile = await db.query.userToEntity.findFirst({
          where: and(eq(userToEntity.id, id)),
        });

        return profile?.categories;
      } catch (error) {
        log.error(`Error in getUserCategories: ${error}`);
        throw error;
      }
    },

    async updateUserLocation(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        const profile = await db.query.userToEntity.findFirst({
          where: and(eq(userToEntity.userId, id)),
        });

        const location = await db.query.userLocation.findFirst({
          where: eq(userLocation.userId, id)
        });

        if (location) {
          await db
            .update(userLocation)
            .set({
              latitude: input.latitude,
              longitude: input.longitude,
            })
            .where(eq(userLocation.userId, id));
        } else {
          await db.insert(userLocation).values({
            latitude: input.latitude,
            longitude: input.longitude,
            userId: id,
          });
        }

        log.info(`Updated user location for user ${id}`);
        return null;
      } catch (error) {
        log.error(`Error in updateUserLocation: ${error}`);
        throw error;
      }
    },

    async getOnlineConnections(_: any, { limit, offset }: any, context: any) {
      try {
        const { entityId, db, id: currentUserId } = await checkAuth(context);

        const data = await db
          .selectDistinct({
            id: userToEntity.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            cover: user.cover,
            designation: aboutUser.headline,
            isOnline: sql`true`.as("is_online"),
            connectedAt: connections.createdAt,
            status: sql`'CONNECTED'`.as("status"),
          })
          .from(connections)
          .innerJoin(
            userToEntity,
            or(
              and(
                eq(connections.user1, currentUserId),
                eq(connections.user2, userToEntity.id),
              ),
              and(
                eq(connections.user2, currentUserId),
                eq(connections.user1, userToEntity.id),
              ),
            ),
          )
          .innerJoin(user, eq(userToEntity.userId, user.id))
          .leftJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))
          .where(
            and(
              eq(connections.entity, entityId),
              eq(connections.connectionStatusEnum, "ACCEPTED"),
              eq(userToEntity.isOnline, true),
              sql`${userToEntity.lastActive} + interval '10 minutes' > now()`,
            ),
          )
          .limit(limit)
          .offset(offset);

        const [totalCountResult] = await db
          .select({
            count: sql`count(*)`,
          })
          .from(connections)
          .innerJoin(
            userToEntity,
            or(
              and(
                eq(connections.user1, currentUserId),
                eq(connections.user2, userToEntity.id),
              ),
              and(
                eq(connections.user2, currentUserId),
                eq(connections.user1, userToEntity.id),
              ),
            ),
          )
          .where(
            and(
              eq(connections.entity, entityId),
              eq(connections.connectionStatusEnum, "ACCEPTED"),
              eq(userToEntity.isOnline, true),
              sql`${userToEntity.lastActive} + interval '10 minutes' > now()`,
            ),
          );

        log.info(`Fetched online connections count: ${data.length}`);

        return {
          friends: data || [],
          count: Number(totalCountResult?.count || 0),
        };
      } catch (error) {
        log.error(`Error in getOnlineConnections: ${error}`);
        throw error;
      }
    },

    async getEducationItemById(_: any, { id: itemId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.getEducationItemById({
          db,
          userId,
          itemId,
        });
      } catch (error) {
        log.error(`Error in getEducationItemById: ${error}`);
        throw error;
      }
    },

    async getExperienceItemById(_: any, { id: itemId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.getExperienceItemById({
          db,
          userId,
          itemId,
        });
      } catch (error) {
        log.error(`Error in getExperienceItemById: ${error}`);
        throw error;
      }
    },

    async getSkillsItemById(_: any, { id: itemId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.getSkillsItemById({ db, userId, itemId });
      } catch (error) {
        log.error(`Error in getSkillsItemById: ${error}`);
        throw error;
      }
    },

    async getSocialLinkById(_: any, { id: itemId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.getSocialLinkById({ db, userId, itemId });
      } catch (error) {
        log.error(`Error in getSocialLinkById: ${error}`);
        throw error;
      }
    },

    async getProfileCompletion(_: any, __: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);

        return await UserService.getProfileCompletion({
          userId,
          db,
        });
      } catch (error) {
        log.error(`Error in getProfileCompletion: ${error}`);
        throw error;
      }
    },

    async getUserProfile(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = await checkAuth(context);

        return await NetworkService.getUserProfile({
          db,
          currentUserId: id,
          entityId,
          userId: input.id,
        });
      } catch (error: any) {
        log.error("Error in getUserProfile", { error, input });
        throw error;
      }
    },

    async getProfileViewers(_: any, { input }: any, context: any) {
      try {
        const { db, id, entityId } = await checkAuth(context);
        const { limit, cursor } = input || {};

        const set = await NetworkService.getProfileViewers({
          db,
          currentUserId: id,
          entityId,
          limit,
          cursor,
        });
        return set;
      } catch (error) {
        log.error(`Error in getProfileViewers: ${error}`);
        throw error;
      }
    },
  },

  Mutation: {
    async updateUserCategories(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        await db
          .update(userToEntity)
          .set({ categories: input })
          .where(eq(userToEntity.id, id));

        return input;
      } catch (error) {
        log.error(`Error in updateUserCategories: ${error}`);
        throw error;
      }
    },

    async updateUserInterests(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        await db
          .update(userToEntity)
          .set({ interests: input })
          .where(eq(userToEntity.id, id));

        return input;
      } catch (error) {
        log.error(`Error in updateUserInterests: ${error}`);
        throw error;
      }
    },

    async updateProfileDetails(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        log.info(`Updating profile details for user ${userId}`);

        let avatar;
        if (input.profileImage) {
          avatar = await StorageService.uploadFile(
            input.profileImage,
            "", // entityId
            "USER", // moduleType
            userId,
            db,
            { processImage: true },
          );
        }

        const userUpdateData: any = {
          firstName: input.firstName,
          lastName: input.lastName,
          location: input.location,
        };

        if (avatar) {
          userUpdateData.avatar = avatar;
        }

        await db.update(user).set(userUpdateData).where(eq(user.id, userId));

        await db
          .update(aboutUser)
          .set({ headline: input.headline })
          .where(eq(aboutUser.userId, userId));

        if (input.dob) {
          await db
            .update(userProfile)
            .set({ DOB: input.dob })
            .where(eq(userProfile.userId, userId));
        }

        const profile = await db.query.userToEntity.findFirst({
          where: and(eq(userToEntity.userId, userId)),
          with: {
            user: {
              with: {
                about: true,
                profile: true,
              },
            },
          },
        });
        
        return profile;
      } catch (error) {
        log.error(`Error in updateProfileDetails: ${error}`);
        throw error;
      }
    },

    async updateProfileCover(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        log.info(`Updating profile cover for user ${userId}`);

        let cover;
        if (input.cover) {
          cover = await StorageService.uploadFile(
            input.cover,
            "",
            "USER",
            userId,
            db,
            { processImage: true },
          );
        }
        if (cover) {
          await db
            .update(user)
            .set({
              cover,
            })
            .where(eq(user.id, userId));
        }

        const updatedUser = await db.query.user.findFirst({
          where: and(eq(user.id, userId)),
        });

        return updatedUser;
      } catch (error) {
        log.error(`Error in updateProfileCover: ${error}`);
        throw error;
      }
    },

    async editEducation(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const updated = await ProfileService.updateEducation({
          db,
          userId,
          educationData: input.education,
        });

        return updated.education;
      } catch (error) {
        log.error(`Error in editEducation: ${error}`);
        throw new Error("Failed to update education");
      }
    },

    async editExperience(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const updated = await ProfileService.updateExperience({
          db,
          userId,
          experienceData: input.experience,
        });

        return updated.experience;
      } catch (error) {
        log.error(`Error in editExperience: ${error}`);
        throw new Error("Failed to update experience");
      }
    },

    async addEducationItem(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.addEducationItem({ db, userId, input });
      } catch (error) {
        log.error(`Error in addEducationItem: ${error}`);
        throw error;
      }
    },

    async editEducationItem(_: any, { id: itemId, input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.editEducationItem({
          db,
          userId,
          itemId,
          input,
        });
      } catch (error) {
        log.error(`Error in editEducationItem: ${error}`);
        throw error;
      }
    },

    async deleteEducationItem(_: any, { id: itemId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.deleteEducationItem({ db, userId, itemId });
      } catch (error) {
        log.error(`Error in deleteEducationItem: ${error}`);
        throw error;
      }
    },

    async addExperienceItem(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.addExperienceItem({ db, userId, input });
      } catch (error) {
        log.error(`Error in addExperienceItem: ${error}`);
        throw error;
      }
    },

    async editExperienceItem(_: any, { id: itemId, input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.editExperienceItem({
          db,
          userId,
          itemId,
          input,
        });
      } catch (error) {
        log.error(`Error in editExperienceItem: ${error}`);
        throw error;
      }
    },

    async deleteExperienceItem(_: any, { id: itemId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.deleteExperienceItem({
          db,
          userId,
          itemId,
        });
      } catch (error) {
        log.error(`Error in deleteExperienceItem: ${error}`);
        throw error;
      }
    },

    async editSkills(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const updated = await ProfileService.updateSkills({
          db,
          userId,
          skillsData: input,
        });

        return updated.skills;
      } catch (error) {
        log.error(`Error in editSkills: ${error}`);
        throw new Error("Failed to update skills");
      }
    },

    async addSkillsItem(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.addSkillsItem({ db, userId, input });
      } catch (error) {
        log.error(`Error in addSkillsItem: ${error}`);
        throw error;
      }
    },

    async editSkillsItem(_: any, { id: itemId, input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.editSkillsItem({
          db,
          userId,
          itemId,
          input,
        });
      } catch (error) {
        log.error(`Error in editSkillsItem: ${error}`);
        throw error;
      }
    },

    async deleteSkillsItem(_: any, { id: itemId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.deleteSkillsItem({ db, userId, itemId });
      } catch (error) {
        log.error(`Error in deleteSkillsItem: ${error}`);
        throw error;
      }
    },

    async addSocialLink(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.addSocialLinksItem({ db, userId, input });
      } catch (error) {
        log.error(`Error in addSocialLink: ${error}`);
        throw error;
      }
    },

    async editSocialLink(_: any, { id: itemId, input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.editSocialLinksItem({
          db,
          userId,
          itemId,
          input,
        });
      } catch (error) {
        log.error(`Error in editSocialLink: ${error}`);
        throw error;
      }
    },

    async deleteSocialLink(_: any, { id: itemId }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        return await ProfileService.deleteSocialLinksItem({
          db,
          userId,
          itemId,
        });
      } catch (error) {
        log.error(`Error in deleteSocialLink: ${error}`);
        throw error;
      }
    },

    async updateOnlineStatus(_: any, __: any, context: any) {
      try {
        const { entityId, db, id } = await checkAuth(context);

        return await UserService.updateOnlineStatus({
          userId: id,
          entityId,
          db,
        });
      } catch (error) {
        log.error(`Error in updateOnlineStatus: ${error}`);
        throw error;
      }
    },
  },
};

export { profileResolvers };
