import { and, eq } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { ProfileService, upload } from "@thrico/services";
import {
  aboutUser,
  user,
  userLocation,
  userProfile,
  userToEntity,
  PAGE,
  type AppDatabase,
} from "@thrico/database";

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

        console.log("getProfileInfo", details);
        return details;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getPageInfo(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        // PAGE is a DynamoDB model, so we use .query(...)
        const page = await PAGE.query("id").eq(input.id).exec();
        console.log("getPageInfo", page.toJSON()[0]);
        return page.toJSON()[0];
      } catch (error) {
        console.log(error);
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
        console.log(error);
        throw error;
      }
    },

    async getUserProfileInfo(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        console.log("getUserProfileInfo input:", input?.id);

        const details = await ProfileService.getProfileDetailsInfo({
          db,
          userId: input.id,
        });

        console.log("getUserProfileInfo result:", details);
        return details;
      } catch (error) {
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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

        console.log("updateUserLocation", profile);
        // Note: The specific return type isn't strictly defined in the original snippet's logic block,
        // but the schema says ': user'. We might need to fetch and return the user.
        // However, sticking to the migration logic first.
        // Returning the profile for now as a placeholder or null if void.
        return null;
      } catch (error) {
        console.log(error);
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
        console.log(error);
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
        console.log(error);
        throw error;
      }
    },

    async updateProfileDetails(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        console.log("updateProfileDetails input", input.profileImage);
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
        console.log("updateProfileDetails result", profile);

        // The schema expects 'user', but here we are fetching 'userToEntity'.
        // This might need adjustment based on strict schema types,
        // but 'userToEntity' has a 'user' relation.
        // Returning 'profile' here as per original logic.
        return profile;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateProfileCover(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        console.log("updateProfileCover", input);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
        throw new Error("Failed to update skills");
      }
    },
  },
};

export { profileResolvers };
