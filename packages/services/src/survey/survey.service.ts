import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";
import { feedBack } from "@thrico/database";

export class SurveyService {
  static async getSurveyById({ surveyId, db }: { surveyId: string; db: any }) {
    try {
      if (!surveyId) {
        throw new GraphQLError("Survey ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting survey by ID", { surveyId });

      // TODO: Implement when surveys table is available
      log.warn("getSurveyById not yet implemented", { surveyId });
      return { message: "Get survey by ID not implemented yet." };
    } catch (error) {
      log.error("Error in getSurveyById", { error, surveyId });
      throw error;
    }
  }

  static async getSurveyByEntityId({
    entityId,
    db,
  }: {
    entityId: string;
    db: any;
  }) {
    try {
      if (!entityId) {
        throw new GraphQLError("Entity ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting surveys by entity ID", { entityId });

      const surveys = await db
        .select()
        .from(feedBack)
        .where(eq(feedBack.entity, entityId));

      log.info("Surveys retrieved", { entityId, count: surveys.length });
      return surveys;
    } catch (error) {
      log.error("Error in getSurveyByEntityId", { error, entityId });
      throw error;
    }
  }

  static async createSurvey({
    entityId,
    userId,
    input,
    db,
  }: {
    entityId: string;
    userId: string;
    input: any;
    db: any;
  }) {
    try {
      if (!entityId || !userId) {
        throw new GraphQLError("Entity ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Creating survey", { entityId, userId });
      log.warn("createSurvey not yet implemented", { entityId, userId });

      return { message: "Survey creation not implemented yet." };
    } catch (error) {
      log.error("Error in createSurvey", { error, entityId, userId });
      throw error;
    }
  }
}
