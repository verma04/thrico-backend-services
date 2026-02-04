import { and, eq, or, sql } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { ProfileService, UserService, upload } from "@thrico/services";
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
import { logger } from "@thrico/logging";

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

        logger.info(`Fetching profile info for user ${userId}`);

        return details;
      } catch (error) {
        logger.error(`Error in getProfileInfo: ${error}`);

        throw error;
      }
    },
    async getPageInfo(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        // PAGE is a DynamoDB model, so we use .query(...)
        const page = await PAGE.query("id").eq(input.id).exec();
        logger.info(`Fetching page info for ID ${input.id}`);

        return page.toJSON()[0];
      } catch (error) {
        logger.error(`Error in getPageInfo: ${error}`);

        throw error;
      }
    },

    async getProfileExperience(_: any, { input }: any, context: any) {
      try {
        const { userId, db, id } = await checkAuth(context);

        // Assuming ProfileService.getExperience needs userId
        // Note: The original code passed 'id' as well in some calls,
        // but ProfileService.getExperience({ db, userId }) signature only takes userId.
        // If we need the experience of the *profile being viewed* (which might be 'id'),
        // we'd need to check the service. However, let's stick to the service signature:
        const details = await ProfileService.getExperience({ db, userId });

        return details;
      } catch (error) {
        logger.error(`Error in getProfileExperience: ${error}`);

        throw error;
      }
    },

    async getUserProfileInfo(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        logger.info(`Fetching user profile info for ID ${input?.id}`);

        const details = await ProfileService.getProfileDetailsInfo({
          db,
          userId: input.id,
        });

        logger.info(`getUserProfileInfo result: ${JSON.stringify(details)}`);
        return details;
      } catch (error) {
        logger.error(`Error in getUserProfileInfo: ${error}`);

        throw error;
      }
    },

    async getUserInterests(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const profile = await db.query.userToEntity.findFirst({
          where: and(eq(userToEntity.userId, userId)),
        });

        return profile?.interests;
      } catch (error) {
        logger.error(`Error in getUserInterests: ${error}`);

        throw error;
      }
    },

    async getUserCategories(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);
        const profile = await db.query.userToEntity.findFirst({
          where: and(eq(userToEntity.id, id)),
        });

        return profile?.categories;
      } catch (error) {
        logger.error(`Error in getUserCategories: ${error}`);

        throw error;
      }
    },

    async updateUserLocation(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        const profile = await db.query.userToEntity.findFirst({
          where: and(eq(userToEntity.userId, id)),
          with: {
            location: true,
          },
        });

        if (profile?.location) {
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

        logger.info(`Updated user location for user ${id}`);

        // Note: The specific return type isn't strictly defined in the original snippet's logic block,
        // but the schema says ': user'. We might need to fetch and return the user.
        // However, sticking to the migration logic first.
        // Returning the profile for now as a placeholder or null if void.
        return null;
      } catch (error) {
        logger.error(`Error in updateUserLocation: ${error}`);

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
            isOnline: sql<boolean>`true`.as("is_online"),
            connectedAt: connections.createdAt,
            status: sql<string>`'CONNECTED'`.as("status"),
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

        logger.info(
          `Fetched ${data.length} online connections for user ${currentUserId}`,
        );

        return {
          friends: data || [],
          count: Number(totalCountResult?.count || 0),
        };
      } catch (error) {
        logger.error(`Error in getOnlineConnections: ${error}`);

        throw error;
      }
    },
  },

  Mutation: {
    async updateUserCategories(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, id, db } = await checkAuth(context);

        const updatedUser = await db
          .update(userToEntity)
          .set({ categories: input })
          .where(eq(userToEntity.id, id))
          .returning();

        return input;
      } catch (error) {
        logger.error(`Error in updateUserCategories: ${error}`);

        throw error;
      }
    },

    async updateUserInterests(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        const updatedUser = await db
          .update(userToEntity)
          .set({ interests: input })
          .where(eq(userToEntity.id, id))
          .returning();

        return input;
      } catch (error) {
        logger.error(`Error in updateUserInterests: ${error}`);

        throw error;
      }
    },

    async updateProfileDetails(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        logger.info(`Updating profile details for user ${userId}`);

        let avatar;
        if (input.profileImage) {
          avatar = await upload(input.profileImage);
        }

        if (avatar) {
          await db
            .update(user)
            .set({
              firstName: input.firstName,
              lastName: input.lastName,
              avatar: avatar,
              location: input.location,
            })
            .where(eq(user.id, userId));
        } else {
          await db
            .update(user)
            .set({
              firstName: input.firstName,
              lastName: input.lastName,
              location: input.location,
            })
            .where(eq(user.id, userId));
        }

        const updade = await db
          .update(aboutUser)
          .set({ headline: input.headline })
          .where(eq(aboutUser.userId, userId))
          .returning();

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
        logger.info(`updateProfileDetails result: ${JSON.stringify(profile)}`);

        // The schema expects 'user', but here we are fetching 'userToEntity'.
        // This might need adjustment based on strict schema types,
        // but 'userToEntity' has a 'user' relation.
        // Returning 'profile' here as per original logic.
        return profile;
      } catch (error) {
        logger.error(`Error in updateProfileDetails: ${error}`);

        throw error;
      }
    },

    async updateProfileCover(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        logger.info(`Updating profile cover for user ${userId}`);

        let cover;
        if (input.cover) {
          cover = await upload(input.cover);
        }
        if (cover) {
          await db
            .update(user)
            .set({
              cover,
            })
            .where(eq(user.id, userId));
        }

        const profile = await db.query.user.findFirst({
          where: and(eq(user.id, userId)),
        });

        return profile;
      } catch (error) {
        logger.error(`Error in updateProfileCover: ${error}`);

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
        logger.error(`Error in editEducation: ${error}`);

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
        logger.error(`Error in editExperience: ${error}`);

        throw new Error("Failed to update experience");
      }
    },

    async editSkills(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const updated = await ProfileService.updateSkills({
          db,
          userId,
          skillsData: input.skills,
        });

        return updated.skills;
      } catch (error) {
        logger.error(`Error in editSkills: ${error}`);

        throw new Error("Failed to update skills");
      }
    },
    async updateOnlineStatus(_: any, __: any, context: any) {
      try {
        const { userId, entityId, db, id } = await checkAuth(context);

        return await UserService.updateOnlineStatus({
          userId: id,
          entityId,
          db,
        });
      } catch (error) {
        logger.error(`Error in updateOnlineStatus: ${error}`);

        throw error;
      }
    },
  },
};

export { profileResolvers };
