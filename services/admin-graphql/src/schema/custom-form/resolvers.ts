import checkAuth from "../../utils/auth/checkAuth.utils";
import { CustomFormService } from "@thrico/services";

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
      const { entity, db } = await checkAuth(context);
      return await CustomFormService.deleteCustomForm({
        id,
        entityId: entity,
        db,
      });
    },

    async addQuestion(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await CustomFormService.addQuestion({
        entityId: entity,
        input,
        db,
      });
    },

    async editQuestion(_: any, { id, input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await CustomFormService.editQuestion({
        id,
        entityId: entity,
        input,
        db,
      });
    },

    async deleteQuestion(_: any, { id }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await CustomFormService.deleteQuestion({
        id,
        entityId: entity,
        db,
      });
    },

    async reorderQuestions(_: any, { input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await CustomFormService.reorderQuestions({
        entityId: entity,
        input,
        db,
      });
    },

    async updateFormSettings(_: any, { id, input }: any, context: any) {
      const { entity, db } = await checkAuth(context);
      return await CustomFormService.updateFormSettings({
        id,
        entityId: entity,
        input,
        db,
      });
    },
  },
};
