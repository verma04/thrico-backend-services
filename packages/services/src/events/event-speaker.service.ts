import { eventSpeakers } from "@thrico/database";
import { eq, and, desc } from "drizzle-orm";
import { log } from "@thrico/logging";

interface AddSpeakerInput {
  eventId: string;
  speakerData: Record<string, any>;
}

interface RemoveSpeakerInput {
  eventId: string;
  speakerId: string;
}

interface GetSpeakersOptions {
  eventId: string;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
  sortByFeaturedFirst?: boolean;
}

export class EventSpeakerService {
  constructor(private db: any) {}

  async addSpeaker({ eventId, speakerData }: AddSpeakerInput) {
    try {
      const [result] = await this.db
        .insert(eventSpeakers)
        .values({
          ...speakerData,
          eventId,
        })
        .returning();
      console.log("Added Speaker:", result);
      return result;
    } catch (error) {
      log.error("Error adding speaker", { error });
      throw error;
    }
  }

  async getSpeakersByEvent(options: GetSpeakersOptions) {
    const {
      eventId,
      isFeatured,
      page = 1,
      limit = 20,
      sortByFeaturedFirst = true,
    } = options;

    try {
      let whereClause: any = eq(eventSpeakers.eventId, eventId);
      if (typeof isFeatured === "boolean") {
        whereClause = and(
          whereClause,
          eq(eventSpeakers.isFeatured, isFeatured)
        );
      }

      let query = this.db.query.eventSpeakers.findMany({
        where: whereClause,
        limit,
        offset: (page - 1) * limit,
      });

      let speakers = await query;
      if (sortByFeaturedFirst) {
        speakers = speakers.sort(
          (a: any, b: any) => Number(b.isFeatured) - Number(a.isFeatured)
        );
      }

      return {
        speakers,
        pagination: {
          page,
          limit,
          count: speakers.length,
        },
      };
    } catch (error) {
      log.error("Error fetching speakers", { error });
      throw error;
    }
  }

  async removeSpeaker({ eventId, speakerId }: RemoveSpeakerInput) {
    try {
      await this.db
        .delete(eventSpeakers)
        .where(
          and(
            eq(eventSpeakers.eventId, eventId),
            eq(eventSpeakers.id, speakerId)
          )
        );
      console.log(`Removed speaker ${speakerId} from event ${eventId}`);
      return { success: true, message: "Speaker removed successfully" };
    } catch (error) {
      log.error("Error removing speaker", { error });
      throw error;
    }
  }

  async markSpeakerFeatured(
    eventId: string,
    speakerId: string,
    isFeatured: boolean = true
  ) {
    try {
      const result = await this.db
        .update(eventSpeakers)
        .set({ isFeatured })
        .where(
          and(
            eq(eventSpeakers.eventId, eventId),
            eq(eventSpeakers.id, speakerId)
          )
        )
        .returning();
      return result;
    } catch (error) {
      log.error("Error marking speaker as featured", { error });
      throw error;
    }
  }

  async editSpeaker(
    eventId: string,
    speakerId: string,
    updateData: Record<string, any>
  ) {
    try {
      const [result] = await this.db
        .update(eventSpeakers)
        .set(updateData)
        .where(
          and(
            eq(eventSpeakers.eventId, eventId),
            eq(eventSpeakers.id, speakerId)
          )
        )
        .returning();
      return result;
    } catch (error) {
      log.error("Error editing speaker", { error });
      throw error;
    }
  }
}
