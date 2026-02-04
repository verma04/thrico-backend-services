import checkAuth from "../../utils/auth/checkAuth.utils";
import { SurveyService } from "@thrico/services";

export const surveyResolvers = {
  Query: {
    async getSurveys(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.getSurveys({ entityId: entity, input, db });
    },

    async getSurvey(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.getSurvey({ id, entityId: entity, db });
    },

    async getSurveyResponses(_: any, { surveyId, input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.getSurveyResponses({
        surveyId,
        entityId: entity,
        input,
        db,
      });
    },

    async getSurveyResults(_: any, { surveyId }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.getSurveyResults({
        surveyId,
        entityId: entity,
        db,
      });
    },

    async getSurveyStats(_: any, { timeRange }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.getSurveyStats({
        entityId: entity,
        timeRange,
        db,
      });
    },

    async getSurveyTemplates() {
      return await SurveyService.getSurveyTemplates();
    },
  },
  Mutation: {
    async addSurvey(_: any, { input }: any, context: any) {
      const { entity, db, id } = await checkAuth(context);
      return await SurveyService.addSurvey({
        entityId: entity,
        userId: id,
        input,
        db,
      });
    },

    async createSurveyFromTemplate(_: any, { templateId }: any, context: any) {
      const { entity, db, id } = await checkAuth(context);
      return await SurveyService.createSurveyFromTemplate({
        entityId: entity,
        userId: id,
        templateId,
        db,
      });
    },

    async editSurvey(_: any, { id, input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.editSurvey({
        id,
        entityId: entity,
        input,
        db,
      });
    },

    async deleteSurvey(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.deleteSurvey({ id, entityId: entity, db });
    },

    async publishSurvey(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.publishSurvey({ id, entityId: entity, db });
    },

    async draftSurvey(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await SurveyService.draftSurvey({ id, entityId: entity, db });
    },

    async shareSurveyAsFeed(
      _: any,
      { surveyId, shouldShare, description }: any,
      context: any,
    ) {
      const { entity, db, id } = await checkAuth(context);
      return await SurveyService.shareSurveyAsFeed({
        surveyId,
        shouldShare,
        description,
        userId: id,
        entityId: entity,
        db,
      });
    },
  },
};
