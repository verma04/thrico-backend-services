import checkAuth from "../../utils/auth/checkAuth.utils";
import { CustomFormService } from "@thrico/services";
import { createAuditLog } from "../../utils/audit/auditLog.utils";

export const customFormsResolvers = {
  Query: {
    async getCustomForms(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await CustomFormService.getCustomForms({
        entityId: entity,
        by: input?.by,
        db,
      });
    },

    async getCustomForm(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await CustomFormService.getCustomForm({
        id,
        entityId: entity,
        db,
      });
    },
  },
  Mutation: {
    // async addCustomForm(_: any, { input }: any, context: any) {
    //   const { id, db, entity, role } = await checkAuth(context);
    //   return await CustomFormService.addCustomForm({
    //     userId: id,
    //     entityId: entity,
    //     role,
    //     input,
    //     db,
    //   });
    // },

    // async editCustomForm(_: any, { id, input }: any, context: any) {
    //   const { entity, db } = await checkAuth(context);
    //   return await CustomFormService.editCustomForm({
    //     id,
    //     entityId: entity,
    //     input,
    //     db,
    //   });
    // },

    async deleteCustomForm(_: any, { id }: any, context: any) {
      const { entity, db, id: adminId } = await checkAuth(context);
      const result = await CustomFormService.deleteCustomForm({
        id,
        entityId: entity,
        db,
      });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: "CUSTOM_FORM",
        action: "DELETE_FORM",
        resourceId: id,
      });

      return result;
    },

    async addQuestion(_: any, { input }: any, context: any) {
      const { entity, db, id: adminId } = await checkAuth(context);
      const question = await CustomFormService.addQuestion({
        entityId: entity,
        input,
        db,
      });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: "CUSTOM_FORM",
        action: "ADD_QUESTION",
        resourceId: question.id,
        newState: question,
      });

      return question;
    },

    async editQuestion(_: any, { id, input }: any, context: any) {
      const { entity, db, id: adminId } = await checkAuth(context);
      const question = await CustomFormService.editQuestion({
        id,
        entityId: entity,
        input,
        db,
      });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: "CUSTOM_FORM",
        action: "EDIT_QUESTION",
        resourceId: id,
        newState: question,
      });

      return question;
    },

    async deleteQuestion(_: any, { id }: any, context: any) {
      const { entity, db, id: adminId } = await checkAuth(context);
      const result = await CustomFormService.deleteQuestion({
        id,
        entityId: entity,
        db,
      });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: "CUSTOM_FORM",
        action: "DELETE_QUESTION",
        resourceId: id,
      });

      return result;
    },

    async reorderQuestions(_: any, { input }: any, context: any) {
      const { entity, db, id: adminId } = await checkAuth(context);
      const result = await CustomFormService.reorderQuestions({
        entityId: entity,
        input,
        db,
      });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: "CUSTOM_FORM",
        action: "REORDER_QUESTIONS",
      });

      return result;
    },

    async updateFormSettings(_: any, { id, input }: any, context: any) {
      const { entity, db, id: adminId } = await checkAuth(context);
      const result = await CustomFormService.updateFormSettings({
        id,
        entityId: entity,
        input,
        db,
      });

      await createAuditLog(db, {
        adminId: adminId,
        entityId: entity,
        module: "CUSTOM_FORM",
        action: "UPDATE_SETTINGS",
        resourceId: id,
        newState: result,
      });

      return result;
    },
  },
};
