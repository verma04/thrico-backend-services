import checkAuth from "../../utils/auth/checkAuth.utils";
import { userOrg } from "../../utils/common/userOrg";

import {
  entitySettingsGroups,
  trendingConditionsGroups,
} from "@thrico/database";
import { eq } from "drizzle-orm";

const settingsResolvers = {
  Query: {
    async getGroupSettings(_: any, { input }: any, context: any) {
      try {
        const { db, id, entity } = await checkAuth(context);

        const userOrgId = entity;
        const settings = await db.query.entitySettingsGroups.findFirst({
          where: (entitySettingsGroups: any, { eq }: any) =>
            eq(entitySettingsGroups.entity, userOrgId),
        });
        const isTrending = await db.query.trendingConditionsGroups.findFirst({
          where: (trendingConditionsGroups: any, { eq }: any) =>
            eq(trendingConditionsGroups.entity, userOrgId),
        });

        // Handle possible undefined settings if not initialized (though usually they should exist)
        return {
          autoApprove: settings?.autoApprove,
          ...(isTrending || {}),
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getCommunityTermAndConditions(_: any, { input }: any, context: any) {
      try {
        const { db, id, entity } = await checkAuth(context);
        const userOrgId = entity;

        const settings = await db.query.entitySettingsGroups.findFirst({
          where: (entitySettingsGroups: any, { eq }: any) =>
            eq(entitySettingsGroups.entity, userOrgId),
        });
        return settings?.termAndCondition;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getCommunityGuidelines(_: any, { input }: any, context: any) {
      try {
        const { db, id, entity } = await checkAuth(context);
        const userOrgId = entity;

        const settings = await db.query.entitySettingsGroups.findFirst({
          where: (entitySettingsGroups: any, { eq }: any) =>
            eq(entitySettingsGroups.entity, userOrgId),
        });
        console.log(settings);
        return settings?.guideLine;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async updateGroupSettings(_: any, { input }: any, context: any) {
      try {
        const { db, id, entity } = await checkAuth(context);
        const userOrgId = entity;

        const settings = await db
          .update(entitySettingsGroups)
          .set({ autoApprove: input.autoApprove })
          .where(eq(entitySettingsGroups.entity, userOrgId))
          .returning();
        const trendingSettings = await db
          .update(trendingConditionsGroups)
          .set({
            user: input.user,
            discussion: input.discussion,
            views: input.views,
          })
          .where(eq(trendingConditionsGroups.entity, userOrgId))
          .returning();
        return {
          autoApprove: settings[0].autoApprove,
          ...trendingSettings[0],
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async updateCommunityTermAndConditions(
      _: any,
      { input }: any,
      context: any
    ) {
      try {
        const { db, id, entity } = await checkAuth(context);
        const userOrgId = entity;

        const settings = await db
          .update(entitySettingsGroups)
          .set({ termAndCondition: input.content })
          .where(eq(entitySettingsGroups.entity, userOrgId))
          .returning();

        console.log(settings);
        return settings[0].termAndCondition;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async updateCommunityGuidelines(_: any, { input }: any, context: any) {
      try {
        const { db, id, entity } = await checkAuth(context);
        const userOrgId = entity;

        const settings = await db
          .update(entitySettingsGroups)
          .set({ guideLine: input.content })
          .where(eq(entitySettingsGroups.entity, userOrgId))
          .returning();

        console.log(settings);
        return settings[0].guideLine;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { settingsResolvers };
