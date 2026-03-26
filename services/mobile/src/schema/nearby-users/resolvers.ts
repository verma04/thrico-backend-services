import { NearbyUsersService } from "@thrico/services";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { log } from "@thrico/logging";

export const nearbyUsersResolvers = {
  Query: {
    async getNearbyUsers(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        return await NearbyUsersService.getNearbyUsers(db, {
          userId,
          entityId,
          latitude: input.latitude,
          longitude: input.longitude,
          limit: input.limit,
          cursor: input.cursor,
        });
      } catch (error) {
        log.error("Error in getNearbyUsers resolver", error as Error);
        throw error;
      }
    },

    async getNearbyCommunities(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = await checkAuth(context);

        return await NearbyUsersService.getNearbyCommunities(db, {
          entityId,
          latitude: input.latitude,
          longitude: input.longitude,
          limit: input.limit,
        });
      } catch (error) {
        log.error("Error in getNearbyCommunities resolver", error as Error);
        throw error;
      }
    },

    async getNearbyEvents(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = await checkAuth(context);

        return await NearbyUsersService.getNearbyEvents(db, {
          entityId,
          latitude: input.latitude,
          longitude: input.longitude,
          limit: input.limit,
        });
      } catch (error) {
        log.error("Error in getNearbyEvents resolver", error as Error);
        throw error;
      }
    },

    async getNearbyMentors(_: any, { input }: any, context: any) {
      try {
        const { db, userId, entityId } = await checkAuth(context);

        return await NearbyUsersService.getNearbyMentors(db, {
          userId,
          entityId,
          latitude: input.latitude,
          longitude: input.longitude,
          limit: input.limit,
        });
      } catch (error) {
        log.error("Error in getNearbyMentors resolver", error as Error);
        throw error;
      }
    },

    async getMyNearbySettings(_: any, __: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        return await NearbyUsersService.getNearbySettings(db, userId);
      } catch (error) {
        log.error("Error in getMyNearbySettings resolver", error as Error);
        throw error;
      }
    },

    async getMyLocation(_: any, __: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        return await NearbyUsersService.getMyLocation(db, userId);
      } catch (error) {
        log.error("Error in getMyLocation resolver", error as Error);
        throw error;
      }
    },
  },

  Mutation: {
    async updateNearbySettings(_: any, { privacy }: any, context: any) {
      try {
        const { db, userId } = await checkAuth(context);
        await NearbyUsersService.updateNearbySettings(db, userId, privacy);
        return { privacy };
      } catch (error) {
        log.error("Error in updateNearbySettings resolver", error as Error);
        throw error;
      }
    },

    async updateMyNearbyLocation(
      _: any,
      { latitude, longitude }: any,
      context: any,
    ) {
      try {
        const { db, userId } = await checkAuth(context);
        await NearbyUsersService.updateLocation(
          db,
          userId,
          latitude,
          longitude,
        );
        return { success: true, message: "Location updated successfully" };
      } catch (error) {
        log.error("Error in updateMyNearbyLocation resolver", error as Error);
        throw error;
      }
    },
  },
};
