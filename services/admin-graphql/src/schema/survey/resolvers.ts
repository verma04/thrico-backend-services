import checkAuth from "../../utils/auth/checkAuth.utils";
import { SurveyService } from "@thrico/services";
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";
import { createAuditLog } from "../../utils/audit/auditLog.utils";
import { surveys } from "@thrico/database";
import { eq, and } from "drizzle-orm";

export const surveyResolvers = {
  Query: {
    async getSurveys(_: any, { input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.READ);
      const { entity, db } = auth;
      return await SurveyService.getSurveys({ entityId: entity, input, db });
    },

    async getSurvey(_: any, { id }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.READ);
      const { entity, db } = auth;
      return await SurveyService.getSurvey({ id, entityId: entity, db });
    },

    async getSurveyResponses(_: any, { surveyId, input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.READ);
      const { entity, db } = auth;
      return await SurveyService.getSurveyResponses({
        surveyId,
        entityId: entity,
        input,
        db,
      });
    },

    async getSurveyResults(_: any, { surveyId }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.READ);
      const { entity, db } = auth;
      return await SurveyService.getSurveyResults({
        surveyId,
        entityId: entity,
        db,
      });
    },

    async getSurveyStats(_: any, { timeRange }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.READ);
      const { entity, db } = auth;
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
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.CREATE);
      const { entity, db, id } = auth;
      const result = await SurveyService.addSurvey({
        entityId: entity,
        userId: id,
        input,
        db,
      });

      await createAuditLog(db, {
        adminId: id,
        entityId: entity,
        module: AdminModule.SURVEYS,
        action: "CREATE",
        resourceId: result?.id,
        newState: result,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });

      return result;
    },

    async createSurveyFromTemplate(_: any, { templateId }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.CREATE);
      const { entity, db, id } = auth;
      const result = await SurveyService.createSurveyFromTemplate({
        entityId: entity,
        userId: id,
        templateId,
        db,
      });

      await createAuditLog(db, {
        adminId: id,
        entityId: entity,
        module: AdminModule.SURVEYS,
        action: "CREATE_FROM_TEMPLATE",
        resourceId: result?.id,
        newState: result,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });

      return result;
    },

    async editSurvey(_: any, { id, input }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.EDIT);
      const { entity, db, id: adminId } = auth;

      const [previousState] = await db
        .select()
        .from(surveys)
        .where(and(eq(surveys.id, id), eq(surveys.entityId, entity)));

      const result = await SurveyService.editSurvey({
        id,
        entityId: entity,
        input,
        db,
      });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: AdminModule.SURVEYS,
        action: "UPDATE",
        resourceId: id,
        previousState,
        newState: result,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });

      return result;
    },

    async deleteSurvey(_: any, { id }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.DELETE);
      const { entity, db, id: adminId } = auth;

      const [previousState] = await db
        .select()
        .from(surveys)
        .where(and(eq(surveys.id, id), eq(surveys.entityId, entity)));

      const result = await SurveyService.deleteSurvey({ id, entityId: entity, db });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: AdminModule.SURVEYS,
        action: "DELETE",
        resourceId: id,
        previousState,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });

      return result;
    },

    async publishSurvey(_: any, { id }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.EDIT);
      const { entity, db, id: adminId } = auth;
      const result = await SurveyService.publishSurvey({ id, entityId: entity, db });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: AdminModule.SURVEYS,
        action: "PUBLISH",
        resourceId: id,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });

      return result;
    },

    async draftSurvey(_: any, { id }: any, context: any) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.EDIT);
      const { entity, db, id: adminId } = auth;
      const result = await SurveyService.draftSurvey({ id, entityId: entity, db });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: AdminModule.SURVEYS,
        action: "DRAFT",
        resourceId: id,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });

      return result;
    },

    async shareSurveyAsFeed(
      _: any,
      { surveyId, shouldShare, description }: any,
      context: any,
    ) {
      const auth = await checkAuth(context);
      ensurePermission(auth, AdminModule.SURVEYS, PermissionAction.EDIT);
      const { entity, db, id: adminId } = auth;
      const result = await SurveyService.shareSurveyAsFeed({
        surveyId,
        shouldShare,
        description,
        userId: adminId,
        entityId: entity,
        db,
      });

      await createAuditLog(db, {
        adminId,
        entityId: entity,
        module: AdminModule.SURVEYS,
        action: "SHARE_AS_FEED",
        resourceId: surveyId,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });

      return result;
    },
  },
};
