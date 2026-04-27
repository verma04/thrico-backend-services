import checkAuth from "../../utils/auth/checkAuth.utils";
import { MentorshipService } from "@thrico/services";
import { log } from "@thrico/logging";
import { sendMentorshipNotification } from "../../queue/mentorship.queue";
import { mentorshipCategory, mentorshipSkills } from "@thrico/database";
import { eq, desc } from "drizzle-orm";

const categoryResolvers = {
  Query: {
    async getAllMentorCategory(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = (await checkAuth(context)) as any;
        const categories = await db.query.mentorshipCategory.findMany({
          where: eq(mentorshipCategory.entity, entityId),
          orderBy: [desc(mentorshipCategory.createdAt)],
        });
        return categories;
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async getAllMentorSkills(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = (await checkAuth(context)) as any;
        const skills = await db.query.mentorshipSkills.findMany({
          where: eq(mentorshipSkills.entity, entityId),
          orderBy: [desc(mentorshipSkills.createdAt)],
        });
        return skills;
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
    async checkMentorShip(_: any, {}: any, context: any) {
      try {
        const { db, entityId, userId } = (await checkAuth(context)) as any;
        return MentorshipService.checkMentorShip({ db, entityId, id: userId });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },

    async checkMentorShipUrl(_: any, {}: any, context: any) {
      try {
        await checkAuth(context);
        return MentorshipService.checkMentorShipUrl();
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
  },
  Mutation: {
    async registerMentorShip(_: any, { input }: any, context: any) {
      try {
        const user = (await checkAuth(context)) as any;
        const { entityId, userId, db } = user;

        return MentorshipService.registerAsMentorship({
          input,
          userId,
          db,
          entityId,
          queueFn: async (data: any) => {
            await sendMentorshipNotification({
              ...data,
            });
          },
        });
      } catch (error) {
        log.error(error as any);
        throw error;
      }
    },
  },
};

export { categoryResolvers };
