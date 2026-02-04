import { SurveyService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";

export const surveyResolvers = {
  Query: {
    async getSurveys(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        const result = await SurveyService.getSurveysForUser({
          entityId,
          userId,
          db,
          input,
        });

        return result;
      } catch (error) {
        console.error("Error in getSurveys (mobile):", error);
        throw error;
      }
    },

    async getSurveyById(_: any, { id }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        const result = await SurveyService.getSurveyById({
          id,
          userId,
          entityId,
          db,
        });

        return result;
      } catch (error) {
        console.error("Error in getSurveyById (mobile):", error);
        throw error;
      }
    },
  },
  Mutation: {
    async submitSurvey(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        const result = await SurveyService.submitSurvey({
          surveyId: input.surveyId,
          answers: input.answers,
          userId,
          entityId,
          db,
        });

        return result;
      } catch (error) {
        console.error("Error in submitSurvey (mobile):", error);
        throw error;
      }
    },

    async startSurvey(_: any, { surveyId }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        const result = await SurveyService.startSurvey({
          surveyId,
          userId,
          entityId,
          db,
        });

        return result;
      } catch (error) {
        console.error("Error in startSurvey (mobile):", error);
        throw error;
      }
    },

    async saveSurveyResponse(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);

        const result = await SurveyService.saveSurveyResponse({
          responseId: input.responseId,
          answers: input.answers,
          userId,
          db,
        });

        return result;
      } catch (error) {
        console.error("Error in saveSurveyResponse (mobile):", error);
        throw error;
      }
    },
  },
};
