import { AuthService } from "@thrico/services";
import { getDb } from "@thrico/database";
import { DatabaseRegion } from "@thrico/shared";
import { subscriptionClient } from "@thrico/grpc";
import { log } from "@thrico/logging";
import checkAuth from "../utils/auth/checkAuth.utils";
import sendOtp from "../utils/sendOtp.utils";
import { decryptOtp } from "../utils/crypto/otp.crypto";
import generateJwtToken from "../utils/generateJwtToken.utils";

const getDatabase = (region = DatabaseRegion.IND) => getDb(region);

export const resolvers = {
  Query: {
    health: () => "Mobile service is healthy",

    async getUser(_: any, {}: any, context: any) {
      try {
        const { db, id, entityId } = context.user || (await checkAuth(context));
        // Using getCacheUserFn = undefined for now as no cache util is imported
        return AuthService.getUser({ entityId, id, db });
      } catch (error) {
        log.error("Error in getUser", { error });
        throw error;
      }
    },

    async getEntityTheme(_: any, { domain }: any, context: any) {
      try {
        const { entityId, db } = context.user || (await checkAuth(context));
        return AuthService.getEntityTheme({ entityId, db });
      } catch (error) {
        log.error("Error in getEntityTheme", { error, domain });
        throw error;
      }
    },

    async checkOtpId(_: any, { input }: any, context: any) {
      try {
        return AuthService.checkOtpId({ input });
      } catch (error) {
        log.error("Error in checkOtpId", { error, input });
        throw error;
      }
    },

    async checkUserEntity(_: any, { input }: any, context: any) {
      try {
        const db = getDatabase();

        return AuthService.checkUserEntity({ input, db });
      } catch (error) {
        log.error("Error in checkUserEntity", { error, input });
        throw error;
      }
    },

    async checkUserEntitySignup(_: any, { input }: any, context: any) {
      try {
        const db = getDatabase();
        return AuthService.checkUserEntitySignup({ input, db });
      } catch (error) {
        log.error("Error in checkUserEntitySignup", { error, input });
        throw error;
      }
    },

    async getOrgDetails(_: any, { input }: any, context: any) {
      try {
        const { db, entityId } = context.user || (await checkAuth(context));
        return AuthService.getOrgDetails({ entityId, db });
      } catch (error) {
        log.error("Error in getOrgDetails", { error });
        throw error;
      }
    },

    async checkSubscription(_: any, { input }: any, context: any) {
      try {
        const { entityId } = context.user || (await checkAuth(context));
        return AuthService.checkSubscription({
          entityId,
          checkEntitySubscriptionFn: (id) =>
            subscriptionClient.checkEntitySubscription(id),
        });
      } catch (error) {
        log.error("Error in checkSubscription", { error });
        throw error;
      }
    },

    async checkUserOnline(_: any, { input }: any, context: any) {
      try {
        const { db, id } = context.user || (await checkAuth(context));
        return AuthService.checkUserOnline({ id, db });
      } catch (error) {
        log.error("Error in checkUserOnline", { error });
        throw error;
      }
    },

    async checkAllUserAccount(_: any, { input }: any, context: any) {
      try {
        const start = Date.now();
        const { db, id, userId } = context.user || (await checkAuth(context));
        log.info("checkAllUserAccount duration:", {
          duration: Date.now() - start,
        });
        const result = await AuthService.checkAllUserAccount({ db, userId });

        return result;
      } catch (error) {
        log.error("Error in checkAllUserAccount", { error });
        throw error;
      }
    },
  },
  Mutation: {
    async loginWithEmail(_: any, { input }: any, context: any) {
      try {
        return AuthService.loginWithEmail({ input, sendOtpFn: sendOtp });
      } catch (error) {
        log.error("Error in loginWithEmail", { error, email: input?.email });
        throw error;
      }
    },

    async signupWithEmail(_: any, { input }: any, context: any) {
      try {
        return AuthService.signupWithEmail({ input, sendOtpFn: sendOtp });
      } catch (error) {
        log.error("Error in signupWithEmail", { error, email: input?.email });
        throw error;
      }
    },

    async loginByOtp(_: any, { input }: any, context: any) {
      try {
        return AuthService.loginByOtp({ input, decryptOtpFn: decryptOtp });
      } catch (error) {
        log.error("Error in loginByOtp", { error, id: input?.id });
        throw error;
      }
    },

    async chooseAccount(_: any, { input }: any, context: any) {
      try {
        const db = getDatabase();
        return AuthService.chooseAccount({
          input,
          db,
          generateJwtTokenFn: generateJwtToken,
        });
      } catch (error) {
        log.error("Error in chooseAccount", { error, userId: input?.userId });
        throw error;
      }
    },

    async chooseAccountSignup(_: any, { input }: any, context: any) {
      try {
        const db = getDatabase();
        return AuthService.chooseAccountSignup({
          input,
          db,
          generateJwtTokenFn: generateJwtToken,
        });
      } catch (error) {
        log.error("Error in chooseAccountSignup", {
          error,
          userId: input?.userId,
        });
        throw error;
      }
    },

    async switchAccount(_: any, { input }: any, context: any) {
      try {
        const { db, userId } = context.user || (await checkAuth(context));
        return AuthService.switchAccount({
          db,
          userId,
          input,
          generateJwtTokenFn: generateJwtToken,
        });
      } catch (error) {
        log.error("Error in switchAccount", { error });
        throw error;
      }
    },
  },
};
