import { and, desc, eq } from "drizzle-orm";
// import { db } from "../../../../schema";

import checkAuth from "../../utils/auth/checkAuth.utils";

import { userOrg } from "../../utils/common/userOrg";
import { campaign, campaignCategory } from "@thrico/database";
import { GraphQLError } from "graphql";

const givingResolvers = {
  Query: {
    async getAllFundCampaignCategory(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;

        const userOrgId = await userOrg(data.id, db);
        const category = await db.query.campaignCategory.findMany({
          where: (campaignCategory: any, { eq }: any) =>
            eq(campaignCategory.entity, userOrgId),
          orderBy: (campaignCategory: any, { desc }: any) => [
            desc(campaignCategory.createdAt),
          ],
        });

        console.log(category);
        return category;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getAllFundCampaign(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;

        const userOrgId = await userOrg(data.id, db);
        // Corrected from userStory to campaign based on context
        const stories = await db.query.campaign.findMany({
          where: (campaign: any, { eq }: any) =>
            and(eq(campaign.entity, userOrgId)),
          orderBy: (campaign: any, { desc }: any) => [desc(campaign.createdAt)],
          with: {
            category: true,
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

        console.log(stories);
        return stories;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getAllApprovedFundCampaign(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;

        const userOrgId = await userOrg(data.id, db);
        const stories = await db.query.campaign.findMany({
          where: (campaign: any, { eq }: any) =>
            and(eq(campaign.entity, userOrgId), eq(campaign.isApproved, true)),
          orderBy: (campaign: any, { desc }: any) => [desc(campaign.createdAt)],
          with: {
            category: true,
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

        return stories;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getAllRequestedFundCampaign(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;

        const userOrgId = await userOrg(data.id, db);
        const stories = await db.query.campaign.findMany({
          where: (campaign: any, { eq }: any) =>
            and(eq(campaign.entity, userOrgId), eq(campaign.isApproved, false)),
          orderBy: (campaign: any, { desc }: any) => [desc(campaign.createdAt)],
          with: {
            category: true,
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

        return stories;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addFundCampaignCategory(_: any, { input }: any, context: any) {
      try {
        console.log(input);
        const data = await checkAuth(context);
        const { db } = data;

        const userOrgId = await userOrg(data.id, db);

        const set = await db.query.campaignCategory.findFirst({
          where: (campaignCategory: any, { eq }: any) =>
            and(
              eq(campaignCategory.entity, userOrgId),
              eq(campaignCategory.title, input.title)
            ),
        });

        console.log(set);

        if (set) {
          return new GraphQLError("Category AllReady exist", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
        }
        const newCampaignCategory = await db
          .insert(campaignCategory)
          .values({
            title: input.title,
            entity: userOrgId,
          })
          .returning();
        console.log(newCampaignCategory);
        return newCampaignCategory;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteCampaignCategory(_: any, { input }: any, context: any) {
      try {
        const data = await checkAuth(context);
        const { db } = data;
        await userOrg(data.id, db);
        const category = await db
          .delete(campaignCategory)
          .where(eq(campaignCategory.id, input.id))
          .returning();
        return category;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async duplicateCampaignCategory(_: any, { input }: any, context: any) {
      try {
        const { id, db } = await checkAuth(context);

        const category = await db.query.campaignCategory.findFirst({
          where: and(eq(campaignCategory.id, input.id)),
        });

        if (!category) {
          throw new Error("Category not found");
        }

        console.log(input);

        const createFeedBack = await db
          .insert(campaignCategory)
          .values({
            entity: category.entity,
            title: `${category.title}-copy-1`,
          })
          .returning();
        return createFeedBack;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async fundCampaignActions(_: any, { input }: any, context: any) {
      try {
        const { db } = await checkAuth(context);

        // const check = await db.query.userStory.findFirst({
        //   where: (userStory, { eq }) => and(eq(userStory.id, input.ID)),
        // });

        const update = await db
          .update(campaign)
          .set({ isApproved: true })
          .where(eq(campaign.id, input.ID))
          .returning();
        return update[0];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { givingResolvers };
