import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { asc, desc, eq, and } from "drizzle-orm";
import {
  mentorShip,
  mentorShipBooking,
  mentorShipService,
  mentorShipTestimonials,
  entity,
  users,
  user,
} from "@thrico/database";

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
        throw new GraphQLError("Already registered", {
          extensions: { code: "BAD_USER_INPUT" },
        });
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
        const entityDetails = await db.query.entity.findFirst({
          where: eq(entity.id, entityId),
        });

        const userDetails = await db.query.user.findFirst({
          where: eq(user.id, createMentorShipProfile.user),
        });

        queueFn({
          userId,
          entityId,
          mentor: createMentorShipProfile,
          entity: entityDetails,
          isApplicationSent: true,
          status: "PENDING",
          user: userDetails,
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

  static async addMentorshipService({
    userId,
    input,
    db,
    entityId,
  }: {
    userId: string;
    input: any;
    db: any;
    entityId: string;
  }) {
    try {
      if (!userId || !input) {
        throw new GraphQLError("User ID and input are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Adding mentorship service", { userId });

      // Find the mentor profile first
      const mentor = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.user, userId),
      });

      if (!mentor) {
        throw new GraphQLError(
          "Mentorship profile not found. Please register as a mentor first.",
          {
            extensions: { code: "NOT_FOUND" },
          },
        );
      }

      const [newService] = await db
        .insert(mentorShipService)
        .values({
          serviceType: input.serviceType,
          priceType: input.priceType,
          title: input.title,
          duration: input.duration,
          price: input.price,
          shortDescription: input.shortDescription,
          description: input.description,
          webinarUrl: input.webinarUrl,
          mentorShip: mentor.id,
          webinarDate: input.webinarDate,
        })
        .returning();

      log.info("Mentorship service added", {
        userId,
        serviceId: newService.id,
      });
      return [newService];
    } catch (error) {
      log.error("Error in addMentorshipService", { error, userId });
      throw error;
    }
  }

  static async checkWebinarPaymentResponse() {
    try {
      // Logic missing or unsafe to port directly.
      // Returning mock response.
      return { payment: false };
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getServicesDetails({
    db,
    id,
    input,
  }: {
    db: any;
    id: string;
    input: any;
  }) {
    try {
      const booking = await db.query.mentorShipBooking.findFirst({
        where: and(
          eq(mentorShipBooking.service, input.id),
          eq(mentorShipBooking.user, id),
        ),
      });

      const services = await db.query.mentorShipService.findFirst({
        where: eq(mentorShipService.id, input.id),
        with: {
          mentorship: {
            with: {
              user: {
                with: {
                  user: {
                    with: {
                      about: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (services) {
        return {
          booking: {
            isBooking: booking ? true : false,
            createdAt: booking ? booking.createdAt : null,
          },
          ...services,
        };
      }
      return null;
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async bookPaidWebinar() {
    // stub
    return { success: true };
  }

  static async bookFreeWebinar() {
    // stub
    return { success: true };
  }

  static async getAllMentorCategory() {
    try {
      log.warn(
        "getAllMentorCategory: DynamoDB models not fully integrated in mobile service yet.",
      );
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getAllMentorSkills() {
    try {
      log.warn(
        "getAllMentorSkills: DynamoDB models not fully integrated in mobile service yet.",
      );
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async checkMentorShip({
    db,
    entityId,
    id,
  }: {
    db: any;
    entityId: string;
    id: string;
  }) {
    try {
      const find = await db.query.mentorShip.findFirst({
        where: and(eq(mentorShip.user, id), eq(mentorShip.entity, entityId)),
      });

      if (find) {
        return {
          ...find,
          isRequested: true,
        };
      } else {
        return {
          isRequested: false,
        };
      }
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async checkMentorShipUrl() {
    try {
      return { success: true };
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getAllApprovedMentor({
    db,
    entityId,
  }: {
    db: any;
    entityId: string;
  }) {
    try {
      const find = await db.query.mentorShip.findMany({
        where: and(
          eq(mentorShip.isApproved, true),
          eq(mentorShip.entity, entityId),
        ),
        with: {
          user: {
            with: {
              user: {
                with: {
                  about: true,
                },
              },
            },
          },
        },
      });

      return find;
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getAllMentorServicesByID({
    db,
    input,
  }: {
    db: any;
    input: any;
  }) {
    try {
      const find = await db.query.mentorShipService.findMany({
        where: eq(mentorShipService.mentorShip, input.id),
      });

      return find;
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getMentorProfileBySlug({
    db,
    entityId,
    input,
  }: {
    db: any;
    entityId: string;
    input: any;
  }) {
    try {
      const find = await db.query.mentorShip.findFirst({
        where: and(
          eq(mentorShip.slug, input.id),
          eq(mentorShip.entity, entityId),
        ),
        with: {
          user: {
            with: {
              user: {
                with: {
                  about: true,
                },
              },
            },
          },
        },
      });

      return find;
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getEntityUser(db: any, id: string, org_id: string) {
    const user = await db.query.mentorShip.findFirst({
      where: and(eq(mentorShip.user, id), eq(mentorShip.entity, org_id)),
    });
    return user;
  }

  static async getAllMentorServices({
    db,
    id,
    entityId,
  }: {
    db: any;
    id: string;
    entityId: string;
  }) {
    try {
      const user = await MentorshipService.getEntityUser(db, id, entityId);
      if (user) {
        const services = await db.query.mentorShipService.findMany({
          where: eq(mentorShipService.mentorShip, user.id),
          orderBy: desc(mentorShipService.createdAt),
        });
        return services;
      }
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getBookingRequest({ db, id }: { db: any; id: string }) {
    try {
      const mentor = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.user, id),
        orderBy: asc(mentorShip.createdAt),
      });
      if (mentor) {
        const booking = await db.query.mentorShipBooking.findMany({
          where: eq(mentorShipBooking.mentor, mentor.id),
          with: {
            service: true,
            user: {
              with: {
                user: {
                  with: {
                    about: true,
                  },
                },
              },
            },
          },
        });
        return booking;
      }
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getUpcomingBooking({ db, id }: { db: any; id: string }) {
    try {
      const mentor = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.user, id),
      });

      if (mentor) {
        const booking = await db.query.mentorShipBooking.findMany({
          where: and(
            eq(mentorShipBooking.mentor, mentor.id),
            eq(mentorShipBooking.isAccepted, true),
            eq(mentorShipBooking.isCancel, false),
            eq(mentorShipBooking.isCompleted, false),
          ),
          with: {
            service: true,
            user: {
              with: {
                user: {
                  with: {
                    about: true,
                  },
                },
              },
            },
          },
          orderBy: desc(mentorShipBooking.createdAt),
        });
        return booking;
      }
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getCancelledBooking({ db, id }: { db: any; id: string }) {
    try {
      const mentor = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.user, id),
      });

      if (mentor) {
        const booking = await db.query.mentorShipBooking.findMany({
          where: and(
            eq(mentorShipBooking.mentor, mentor.id),
            eq(mentorShipBooking.isCancel, true),
          ),
          orderBy: desc(mentorShipBooking.createdAt),
          with: {
            service: true,
            user: {
              with: {
                user: {
                  with: {
                    about: true,
                  },
                },
              },
            },
          },
        });

        return booking;
      }
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getCompletedBooking({ db, id }: { db: any; id: string }) {
    try {
      const mentor = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.user, id),
      });

      if (mentor) {
        const booking = await db.query.mentorShipBooking.findMany({
          where: and(
            eq(mentorShipBooking.mentor, mentor.id),
            eq(mentorShipBooking.isCompleted, true),
          ),
          orderBy: desc(mentorShipBooking.updatedAt),
          with: {
            service: true,
            user: {
              with: {
                user: {
                  with: {
                    about: true,
                  },
                },
              },
            },
          },
        });
        return booking;
      }
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async duplicateMentorShipServices() {
    return [];
  }

  static async acceptBookingRequest({ db, input }: { db: any; input: any }) {
    try {
      const accept = await db
        .update(mentorShipBooking)
        .set({ requestStatus: "ACCEPTED", isAccepted: true })
        .where(eq(mentorShipBooking.id, input.bookingID))
        .returning();
      return accept[0];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async cancelBooking({ db, input }: { db: any; input: any }) {
    try {
      const booking = await db.query.mentorShipBooking.findFirst({
        where: eq(mentorShipBooking.id, input.bookingID),
      });

      if (booking?.isCancel) {
        throw new GraphQLError("Booking Already Cancelled", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      const [updated] = await db
        .update(mentorShipBooking)
        .set({ isCancel: true })
        .where(eq(mentorShipBooking.id, booking.id))
        .returning();

      return updated;
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async markBookingAsCompleted({ db, input }: { db: any; input: any }) {
    try {
      const booking = await db.query.mentorShipBooking.findFirst({
        where: eq(mentorShipBooking.id, input.bookingID),
      });

      if (booking?.isCompleted) {
        throw new GraphQLError("Booking Already Completed", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      const [updated] = await db
        .update(mentorShipBooking)
        .set({ isCompleted: true })
        .where(eq(mentorShipBooking.id, booking?.id))
        .returning();

      return updated;
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getAllMentorTestimonial({
    db,
    id,
    entityId,
  }: {
    db: any;
    id: string;
    entityId: string;
  }) {
    try {
      const user = await MentorshipService.getEntityUser(db, id, entityId);

      if (user) {
        const testimonial = await db.query.mentorShipTestimonials.findMany({
          where: eq(mentorShipTestimonials.mentorShip, user.id),
          orderBy: desc(mentorShipTestimonials.createdAt),
        });
        return testimonial;
      }
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async addMentorShipTestimonials({
    db,
    id,
    entityId,
    input,
  }: {
    db: any;
    id: string;
    entityId: string;
    input: any;
  }) {
    try {
      const user = await MentorshipService.getEntityUser(db, id, entityId);

      if (user) {
        const [testimonial] = await db
          .insert(mentorShipTestimonials)
          .values({
            testimonial: input.testimonial,
            from: input.from,
            mentorShip: user.id,
          })
          .returning();
        return [testimonial];
      }
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async getAllPendingMentorships({
    db,
    entityId,
    limit,
    offset,
  }: {
    db: any;
    entityId: string;
    limit: number;
    offset: number;
  }) {
    try {
      const pendingMentors = await db.query.mentorShip.findMany({
        where: and(
          eq(mentorShip.entity, entityId),
          eq(mentorShip.mentorStatus, "REQUESTED"),
          eq(mentorShip.isApproved, false),
        ),
        limit,
        offset,
        orderBy: desc(mentorShip.createdAt),
        with: {
          user: {
            with: {
              user: {
                with: {
                  about: true,
                },
              },
            },
          },
        },
      });

      return pendingMentors;
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async duplicateMentorShipTestimonials() {
    try {
      // logic skipped
      return [];
    } catch (error) {
      log.error(error as any);
      throw error;
    }
  }

  static async updateMentorshipStatus({
    db,
    mentorshipId,
    status,
    queueFn,
  }: {
    db: any;
    mentorshipId: string;
    status: "APPROVED" | "BLOCKED" | "PENDING" | "REJECTED";
    queueFn?: (data: any) => void;
  }) {
    try {
      if (!mentorshipId || !status) {
        throw new GraphQLError("Mentorship ID and status are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating mentorship status", { mentorshipId, status });

      const mentorship = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.id, mentorshipId),
      });

      if (!mentorship) {
        throw new GraphQLError("Mentorship not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const [updated] = await db
        .update(mentorShip)
        .set({
          mentorStatus: status,
          isApproved: status === "APPROVED",
          updatedAt: new Date(),
        })
        .where(eq(mentorShip.id, mentorshipId))
        .returning();

      // Send notification via RabbitMQ if queueFn is provided
      if (queueFn) {
        const entityDetails = await db.query.entity.findFirst({
          where: eq(entity.id, mentorship.entity),
        });

        const userDetails = await db.query.user.findFirst({
          where: eq(user.id, mentorship.user),
        });

        queueFn({
          userId: mentorship.user,
          entityId: mentorship.entity,
          mentor: updated,
          entity: entityDetails,
          status: status,
          isStatusUpdate: true,
          user: userDetails,
        });
      }

      log.info("Mentorship status updated", {
        mentorshipId,
        status,
        isApproved: updated.isApproved,
      });

      return updated;
    } catch (error) {
      log.error("Error in updateMentorshipStatus", { error, mentorshipId });
      throw error;
    }
  }

  static async featureMentor({
    db,
    mentorshipId,
    isFeatured,
  }: {
    db: any;
    mentorshipId: string;
    isFeatured: boolean;
  }) {
    try {
      if (!mentorshipId) {
        throw new GraphQLError("Mentorship ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Toggling mentor featured status", {
        mentorshipId,
        isFeatured,
      });

      const mentorship = await db.query.mentorShip.findFirst({
        where: eq(mentorShip.id, mentorshipId),
      });

      if (!mentorship) {
        throw new GraphQLError("Mentorship not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const [updated] = await db
        .update(mentorShip)
        .set({
          isFeatured,
          updatedAt: new Date(),
        })
        .where(eq(mentorShip.id, mentorshipId))
        .returning();

      log.info("Mentor featured status updated", {
        mentorshipId,
        isFeatured: updated.isFeatured,
      });

      return updated;
    } catch (error) {
      log.error("Error in featureMentor", { error, mentorshipId });
      throw error;
    }
  }
}
