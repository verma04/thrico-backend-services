import {
  entitySettingsEvents,
  events,
  eventsWishList,
  posted,
  trendingConditionsEvents,
  user,
} from "@thrico/database";
import { and, desc, eq, sql } from "drizzle-orm";
import { upload } from "../upload";
import slugify from "slugify";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";
import { GamificationEventService } from "../gamification/gamification-event.service";
import { CloseFriendNotificationService } from "../network/closefriend-notification.service";

export class EventsService {
  constructor(private db: any) {}

  // Add this import at the top if using OpenAI
  async generateEmbedding(text: string): Promise<number[]> {
    // Example using OpenAI API (pseudo-code, replace with your actual implementation)
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const response = await openai.embeddings.create({ input: text, model: "text-embedding-ada-002" });
    // return response.data[0].embedding;
    return Array(1536).fill(0); // Placeholder: replace with actual embedding logic
  }

  async createEvent({
    input,
    id,
    entityId,
  }: {
    input: any;
    id: string;
    entityId: string;
  }) {
    try {
      let cover: string | undefined;
      if (input?.cover) {
        cover = await upload(input.cover);
      }

      let slug = slugify(input.title, {
        replacement: "-",
        remove: /[*+~.()'\"!:@]/g,
        lower: true,
        strict: false,
        locale: "vi",
        trim: true,
      });
      const findEvent = await this.db.query.events.findMany({
        where: (events: any, { eq }: any) => eq(events.slug, slug),
      });

      if (findEvent && findEvent.length > 0) {
        const val = Math.floor(1000 + Math.random() * 9000);
        slug = slug + "-" + val;
      }

      // Generate embedding if not provided
      // let embedding = input.embedding;
      // if (!embedding) {
      //   const textForEmbedding = `${input.title} ${input.description || ""}`;
      //   embedding = await this.generateEmbedding(textForEmbedding);
      // }

      const [newEvent] = await this.db.transaction(async (tx: any) => {
        return await tx
          .insert(events)
          .values({
            ...input,
            cover: cover ? cover : "defaultEventCover.png",
            entityId: entityId,
            eventCreator: id,
            slug: slug,
            status: "APPROVED",
            // embedding, // Store the generated embedding
          })
          .returning();
      });

      if (newEvent) {
        // CloseFriendNotificationService.publishNotificationTask({
        //   creatorId: id,
        //   entityId,
        //   type: "EVENT",
        //   contentId: newEvent.id,
        //   title: newEvent.title || "New Event",
        // }).catch((err: any) => {
        //   log.error("Failed to trigger close friend event notification", {
        //     userId: id,
        //     eventId: newEvent.id,
        //     error: err.message,
        //   });
        // });
      }

      // Gamification trigger
      await GamificationEventService.triggerEvent({
        triggerId: "tr-evt-create",
        moduleId: "events",
        userId: id,
        entityId,
      });
    } catch (error) {
      log.error("Error in createEvent", { error });
      throw error;
    }
  }

  async getAllEvents({
    currentUserId,
    entityId,
  }: {
    currentUserId: string;
    entityId: string;
  }) {
    try {
      await this.db
        .insert(trendingConditionsEvents)
        .values({ entity: entityId })
        .onConflictDoNothing();
      await this.db
        .insert(entitySettingsEvents)
        .values({ entity: entityId })
        .onConflictDoNothing();

      const condition = await this.db.query.trendingConditionsEvents.findFirst({
        where: (trendingConditionsGroups: any, { eq }: any) =>
          and(eq(trendingConditionsGroups.entity, entityId)),
      });

      const eventsList = await this.db
        .select({
          id: events.id,
          isFeatured: events.isFeatured,
          isTrending: sql`false`,
          isWishList: sql`EXISTS (SELECT 1 FROM ${eventsWishList} WHERE ${eventsWishList.eventId} = ${events.id} AND ${eventsWishList.userId} = ${currentUserId})`,
          eventCreator: events.eventCreator,
          details: {
            cover: events.cover,
            type: events.type,
            title: events.title,
            description: events.description,
            endDate: events.endDate,
            lastDateOfRegistration: events.lastDateOfRegistration,
            startDate: events.startDate,
            startTime: events.startTime,
            location: events.location,
            numberOfAttendees: events.numberOfAttendees,
            numberOfPost: events.numberOfPost,
            numberOfViews: events.numberOfViews,
          },
          postedBy: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,

            avatar: user.avatar,
          },
        })
        .from(events)
        .leftJoin(user, eq(events.eventCreator, user.id))
        .where(and(eq(events.entityId, entityId)))
        .orderBy(desc(events.createdAt));

      let trendingCount = 5;
      let scored = eventsList.map((e: any) => ({
        ...e,
        trendingScore:
          (condition?.attendees ? e.details.numberOfAttendees || 0 : 0) +
          (condition?.discussion ? e.details.numberOfPost || 0 : 0) +
          (condition?.views ? e.details.numberOfViews || 0 : 0),
      }));
      scored.sort((a: any, b: any) => b.trendingScore - a.trendingScore);
      const trendingIds = new Set(
        scored.slice(0, trendingCount).map((e: any) => e.id),
      );
      const final = eventsList.map((e: any) => ({
        ...e,
        isTrending: trendingIds.has(e.id),
        isOwner: e.eventCreator === currentUserId,
        canReport: e.eventCreator !== currentUserId,
        canDelete: e.eventCreator === currentUserId,
      }));

      console.log(eventsList);
      return {
        events: final,
        pagination: {
          total: final.length,
          page: 1,
          limit: final.length,
        },
      };
    } catch (error) {
      log.error("Error in getAllEvents", { error });
      throw error;
    }
  }

  async wishListEvent({
    userId,
    eventId,
    entityId,
  }: {
    userId: string;
    eventId: string;
    entityId: string;
  }) {
    try {
      const feed = await this.db.query.events.findFirst({
        where: eq(events.id, eventId),
      });

      if (!feed) {
        throw new GraphQLError("Permission Denied", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }

      const checkIsItExist = await this.db.query.eventsWishList.findFirst({
        where: and(
          eq(eventsWishList.eventId, eventId),
          eq(eventsWishList.userId, userId),
          eq(eventsWishList.entityId, entityId),
        ),
      });

      if (!checkIsItExist) {
        await this.db
          .insert(eventsWishList)
          .values({
            eventId: eventId,
            entityId: entityId,
            userId: userId,
          })
          .returning();

        // Gamification trigger for joining event
        await GamificationEventService.triggerEvent({
          triggerId: "tr-evt-join",
          moduleId: "events",
          userId,
          entityId,
        });

        return {
          status: true,
        };
      } else {
        await this.db
          .delete(eventsWishList)
          .where(
            and(
              eq(eventsWishList.eventId, eventId),
              eq(eventsWishList.userId, userId),
            ),
          );
        return {
          status: false,
        };
      }
    } catch (error) {
      log.error("Error in wishListEvent", { error });
      throw error;
    }
  }

  async getEventDetailsById({
    eventId,
    currentUserId,
  }: {
    eventId: string;
    currentUserId: string;
  }) {
    try {
      // Increment the event's view count
      await this.db
        .update(events)
        .set({
          numberOfViews: sql`${events.numberOfViews} + 1`,
        })
        .where(eq(events.id, eventId));

      // Fetch the event details
      const event = await this.db.query.events.findFirst({
        where: eq(events.id, eventId),
        with: {
          postedBy: true,
        },
      });

      if (!event) {
        throw new GraphQLError("Event not found", {
          extensions: {
            code: 404,
            http: { status: 404 },
          },
        });
      }

      // Check if the event is in the user's wishlist
      const isWishList = await this.db.query.eventsWishList.findFirst({
        where: and(
          eq(eventsWishList.eventId, eventId),
          eq(eventsWishList.userId, currentUserId),
        ),
      });

      // Add isOwner, canReport, canDelete fields
      const isOwner = event.eventCreator === currentUserId;

      console.log(event);
      return {
        details: event,
        isWishList: !!isWishList,
        isOwner,
        postedBy: event.postedBy,
        canReport: !isOwner,
        canDelete: isOwner,
      };
    } catch (error) {
      log.error("Error in getEventDetailsById", { error });
      throw error;
    }
  }

  async editGeneralInfo({
    eventId,
    details,
  }: {
    eventId: string;
    details: any;
  }) {
    try {
      const updated = await this.db
        .update(events)
        .set({
          title: details?.title || "Event Title",
          description: details?.description || "Event description...",
          startDate: details?.startDate
            ? new Date(details.startDate)
            : new Date(),
          endDate: details?.endDate ? new Date(details.endDate) : new Date(),
          startTime: details?.startTime || "9:00 AM",
          timezone: details?.timezone || "pst",
          type: details?.eventType || "physical",

          registrationOpen:
            details?.registrationOpen !== undefined
              ? details.registrationOpen
              : true,
        })
        .where(eq(events.id, eventId))
        .returning();

      return updated[0];
    } catch (error) {
      log.error("Error in editGeneralInfo", { error });
      throw error;
    }
  }
}
