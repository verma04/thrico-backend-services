import {
  MomentService,
  MomentRecommendationService,
  StorageService,
} from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { log } from "@thrico/logging";
import { moments } from "@thrico/database";

export const momentResolvers = {
  Query: {
    async getMoment(_: any, { id }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        // await db.delete(moments);
        return await MomentService.getMomentById(id, userId, db);
      } catch (error) {
        log.error("Error in getMoment", { error, id });
        throw error;
      }
    },
    async getAllMoments(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));
        console.log(input);
        return await MomentService.getAllMoments(
          input || {},
          entityId,
          userId,
          db,
        );
      } catch (error) {
        log.error("Error in getAllMoments", { error, input });
        throw error;
      }
    },
    async getMyMoments(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));
        return await MomentService.getMyMoments(
          input || {},
          entityId,
          userId,
          db,
        );
      } catch (error) {
        log.error("Error in getMyMoments", { error, input });
        throw error;
      }
    },
    async getUserMoments(
      _: any,
      { userId: targetUserId, input }: any,
      context: any,
    ) {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));
        return await MomentService.getMoments(
          input || {},
          entityId,
          userId,
          db,
          targetUserId,
        );
      } catch (error) {
        log.error("Error in getUserMoments", { error, targetUserId, input });
        throw error;
      }
    },
    async getMomentComments(_: any, { momentId, input }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        return await MomentService.getMomentComments(
          momentId,
          input || {},
          db,
          userId,
        );
      } catch (error) {
        log.error("Error in getMomentComments", { error, momentId, input });
        throw error;
      }
    },
    async searchMoments(_: any, { query, input }: any, context: any) {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));
        return await MomentService.search(
          query,
          input || {},
          entityId,
          userId,
          db,
        );
      } catch (error) {
        log.error("Error in searchMoments", { error, query, input });
        throw error;
      }
    },
    async getSimilarMoments(_: any, { momentId, input }: any, context: any) {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));
        return await MomentService.getSimilar(
          momentId,
          input || {},
          entityId,
          userId,
          db,
        );
      } catch (error) {
        log.error("Error in getSimilarMoments", { error, momentId, input });
        throw error;
      }
    },
    async getRecommendedMoments(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));
        return await MomentRecommendationService.getPersonalizedFeed(
          input || {},
          entityId,
          userId,
          db,
        );
      } catch (error) {
        log.error("Error in getRecommendedMoments", {
          error,
          userId: context.user?.userId,
        });
        throw error;
      }
    },
    async getMyConnectionMoments(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));
        return await MomentService.getMyConnectionMoments(
          input || {},
          entityId,
          userId,
          db,
        );
      } catch (error) {
        log.error("Error in getMyConnectionMoments", { error, input });
        throw error;
      }
    },
    async getMomentAnalytics(_: any, { momentId }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        return await MomentService.getMomentAnalytics(momentId, userId, db);
      } catch (error) {
        log.error("Error in getMomentAnalytics", { error, momentId });
        throw error;
      }
    },
    async getMyMomentsAnalyticsDashboard(_: any, __: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        return await MomentService.getMyMomentsDashboard(userId, entityId, db);
      } catch (error) {
        log.error("Error in getMyMomentsAnalyticsDashboard", {
          error,
          userId: context.user?.userId,
        });
        throw error;
      }
    },
  },
  Mutation: {
    async toggleMomentReaction(_: any, { momentId }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        return await MomentService.toggleReaction(momentId, userId, db);
      } catch (error) {
        log.error("Error in toggleMomentReaction", { error, momentId });
        throw error;
      }
    },

    async addMomentComment(_: any, { momentId, content }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        return await MomentService.addComment(momentId, content, userId, db);
      } catch (error) {
        log.error("Error in addMomentComment", { error, momentId });
        throw error;
      }
    },

    async toggleMomentWishlist(_: any, { momentId }: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        return await MomentService.toggleWishlist(
          momentId,
          userId,
          entityId,
          db,
        );
      } catch (error) {
        log.error("Error in toggleMomentWishlist", { error, momentId });
        throw error;
      }
    },

    async incrementMomentView(_: any, { momentId }: any, context: any) {
      try {
        const { db } = context.user || (await checkAuth(context));
        return await MomentService.incrementView(momentId, db);
      } catch (error) {
        log.error("Error in incrementMomentView", { error, momentId });
        throw error;
      }
    },
    async trackMomentWatchTime(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        console.log(input);
        return await MomentService.trackWatchTime(input, userId, db);
      } catch (error) {
        log.error("Error in trackMomentWatchTime", { error, input });
        throw error;
      }
    },
    async generateMomentUploadUrl(_: any, { input }: any, context: any) {
      try {
        const { db, entityId, userId } =
          context.user || (await checkAuth(context));
        const data = await MomentService.generateUploadUrl(
          input,
          entityId,
          userId,
          db,
        );
        return data;
      } catch (error) {
        log.error("Error in generateMomentUploadUrl", { error, input });
        throw error;
      }
    },

    async deleteMoment(_: any, { momentId }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));

        return await MomentService.deleteMoment(momentId, userId, db);
      } catch (error) {
        log.error("Error in deleteMoment", { error, momentId });
        throw error;
      }
    },

    async deleteMomentComment(_: any, { commentId }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        return await MomentService.deleteComment(commentId, userId, db);
      } catch (error) {
        log.error("Error in deleteMomentComment", { error, commentId });
        throw error;
      }
    },

    async updateMoment(_: any, { id, input }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        return await MomentService.updateMoment(id, input, userId, db);
      } catch (error) {
        log.error("Error in updateMoment", { error, id, input });
        throw error;
      }
    },
    async confirmMomentUpload(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } =
          context.user || (await checkAuth(context));
        const { fileUrl, caption, thumbnailUrl, shareInFeed = true, isAiContent = false } = input;
        const data = await MomentService.confirmUpload(
          fileUrl,
          caption,
          entityId,
          userId,
          db,
          thumbnailUrl,
          shareInFeed,
          isAiContent,
        );
        console.log(data);
        return data;
      } catch (error) {
        log.error("Error in confirmMomentUpload", { error, input });
        throw error;
      }
    },

    async momentUpload(_: any, { input }: any, context: any) {
      try {
        const {
          db,
          id: userId,
          entityId,
        } = context.user || (await checkAuth(context));
        const { fileUrl, caption, thumbnailUrl, shareInFeed, isAiContent = false } = input;
        return await MomentService.confirmUpload(
          fileUrl,
          caption,
          entityId,
          userId,
          db,
          thumbnailUrl,
          shareInFeed,
          isAiContent,
        );
      } catch (error) {
        log.error("Error in momentUpload", { error, input });
        throw error;
      }
    },
    async uploadImage(_: any, { file }: any, context: any) {
      try {
        const { db, entityId, id: userId } = await checkAuth(context);
        const img = await StorageService.uploadFile(
          file,
          entityId,
          "MOMENT",
          userId,
          db,
          { processImage: true },
        );
        console.log("img", img);
        return `https://cdn.thrico.network/${img}`;
      } catch (error) {
        log.error("Error in uploadImage", { error });
        throw error;
      }
    },
  },
};
