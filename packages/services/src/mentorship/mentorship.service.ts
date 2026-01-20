import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";
import { mentorShip } from "@thrico/database";

export class MentorshipService {
  static async registerAsMentorship({
    input,
    userId,
    db,
    entityId,
    generateSlugFn,
    queueFn,
  }: {
    input: any;
    userId: string;
    db: any;
    entityId: string;
    generateSlugFn?: () => string;
    queueFn?: (data: any) => void;
  }) {
    try {
      if (!userId || !entityId || !input) {
        throw new GraphQLError("User ID, Entity ID, and input are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Registering as mentorship", { userId, entityId });

      const existingMentor = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.user, userId),
      });

      if (existingMentor) {
        throw new GraphQLError(
          "Already registered, wait for admin to approve your application.",
          {
            extensions: { code: "BAD_USER_INPUT" },
          }
        );
      }

      const randomSlug = generateSlugFn
        ? generateSlugFn()
        : `mentor-${Date.now()}`;

      const availability = [
        { name: "Monday", isAvailable: false },
        { name: "Tuesday", isAvailable: false },
        { name: "Wednesday", isAvailable: false },
        { name: "Thursday", isAvailable: false },
        { name: "Friday", isAvailable: false },
        { name: "Saturday", isAvailable: false },
        { name: "Sunday", isAvailable: false },
      ];

      const [createMentorShipProfile] = await db
        .insert(mentorShip)
        .values({
          category: input.category,
          entity: entityId,
          displayName: input.displayName,
          isApproved: false,
          slug: randomSlug,
          featuredArticle: input.featuredArticle,
          intro: input.intro,
          whyDoWantBecomeMentor: input.whyDoWantBecomeMentor,
          greatestAchievement: input.greatestAchievement,
          introVideo: input.introVideo,
          about: input.about,
          user: userId,
          availability,
          agreement: input.agreement,
          isKyc: true,
          skills: input.skills,
        })
        .returning();

      if (queueFn) {
        queueFn({
          userId,
          entityId,
          db,
          mentor: createMentorShipProfile,
        });
      }

      log.info("Mentorship registration created", {
        userId,
        mentorId: createMentorShipProfile.id,
      });

      return {
        success: true,
      };
    } catch (error) {
      log.error("Error in registerAsMentorship", { error, userId, entityId });
      throw error;
    }
  }

  static async getMentorshipProfile({
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

      log.debug("Getting mentorship profile", { userId });

      const profile = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.user, userId),
      });

      if (!profile) {
        throw new GraphQLError("Mentorship profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("Mentorship profile retrieved", {
        userId,
        mentorId: profile.id,
      });
      return profile;
    } catch (error) {
      log.error("Error in getMentorshipProfile", { error, userId });
      throw error;
    }
  }

  static async updateMentorshipProfile({
    userId,
    input,
    db,
  }: {
    userId: string;
    input: any;
    db: any;
  }) {
    try {
      if (!userId || !input) {
        throw new GraphQLError("User ID and input are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating mentorship profile", { userId });

      const [updated] = await db
        .update(mentorShip)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(mentorShip.user, userId))
        .returning();

      if (!updated) {
        throw new GraphQLError("Mentorship profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("Mentorship profile updated", { userId, mentorId: updated.id });
      return updated;
    } catch (error) {
      log.error("Error in updateMentorshipProfile", { error, userId });
      throw error;
    }
  }
}
