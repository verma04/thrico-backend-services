import { StoryService, upload } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";

const storiesResolvers: any = {
  Query: {
    async getMyStories(_: any, __: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        return await StoryService.getMyStories({ db, userId, entityId });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getStoriesFromConnections(_: any, __: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);
        const groupedStories =
          await StoryService.getStoriesGroupedByConnections({
            db,
            userId,
            entityId,
          });
        return groupedStories;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addStory(_: any, { input }: any, context: any) {
      try {
        const { userId, entityId, db } = await checkAuth(context);

        const story = await StoryService.createStory({
          db,
          userId,
          entityId,
          input: {
            image: input.image,
            textOverlays: input.textOverlays,
            caption: input.description || input.caption,
          },
        });
        return story;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async deleteStory(_: any, { input }: any, context: any) {
      try {
        const { userId, db } = await checkAuth(context);
        const deleted = await StoryService.deleteStory({
          db,
          storyId: input.id,
          userId,
        });
        if (!deleted) {
          throw new GraphQLError("Story not found or not authorized", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return deleted;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};

export { storiesResolvers };
