import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { and, eq, sql } from "drizzle-orm";
import {
  aboutUser,
  user,
  userToEntity,
  userProfile,
  theme,
  ADMIN as UserIdentity,
  OTP as OtpModel,
  LOGIN_SESSION as LoginSessionModel,
  ENTITY_THEME as EntityThemeModel,
  OTP,
  USER,
  ENTITY_THEME,
  USER_LOGIN_SESSION,
} from "@thrico/database";
import { v4 as uuidv4 } from "uuid";

export class AuthService {
  static async checkAllUserAccount({
    userId,
    db,
  }: {
    userId: string;
    db: any;
  }) {
    try {
      if (!userId) {
        throw new GraphQLError("User ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Checking all user accounts", { userId });

      const userRecord = await db.query.user.findFirst({
        where: (u: any, { eq }: any) => eq(u.id, userId),
      });

      if (!userRecord) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const allUsers = await db.query.user.findMany({
        where: (u: any, { eq }: any) => eq(u.thricoId, userRecord.thricoId),
        with: {
          entity: true,
          userEntity: true,
        },
      });

      const filteredUsers = allUsers
        .filter((u: any) => u.entity && u.userEntity)
        .map((u: any) => ({
          id: u.entity.id,
          name: u.entity.name,
          logo: u.entity.logo,
          lastActive: u.userEntity.lastActive,
        }));

      log.info("User accounts retrieved", {
        userId,
        count: filteredUsers.length,
      });
      return filteredUsers;
    } catch (error) {
      log.error("Error in checkAllUserAccount", { error, userId });
      throw error;
    }
  }

  static async getUser({
    entityId,
    id,
    db,
    getCacheUserFn,
  }: {
    entityId: string;
    id: string;
    db: any;
    getCacheUserFn?: (entityId: string, id: string) => Promise<string | null>;
  }) {
    try {
      if (!entityId || !id) {
        throw new GraphQLError("Entity ID and User ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting user", { entityId, id });

      // Check cache if function provided
      if (getCacheUserFn) {
        const cachedUser = await getCacheUserFn(entityId, id);
        if (cachedUser) {
          log.debug("User retrieved from cache", { entityId, id });
          return JSON.parse(cachedUser);
        }
      }

      const findOrg = await db.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity?.id, id),
          eq(userToEntity?.entityId, entityId),
        ),
      });

      if (!findOrg) {
        throw new GraphQLError("Permission denied.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const profile = await db.query.userToEntity.findFirst({
        where: and(eq(userToEntity.userId, findOrg.userId)),
        with: {
          user: {
            with: {
              about: true,
              profile: true,
            },
          },
        },
      });

      if (!profile?.user) {
        throw new GraphQLError("User profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("User retrieved", { entityId, id, userId: profile.user.id });
      return profile.user;
    } catch (error) {
      log.error("Error in getUser", { error, entityId, id });
      throw error;
    }
  }

  static async switchAccount({
    db,
    userId,
    input,
    generateJwtTokenFn,
    sessionId: currentSessionId,
  }: {
    db: any;
    userId: string;
    input: any;
    generateJwtTokenFn: (data: any) => Promise<string>;
    sessionId?: string;
  }): Promise<{ token: string; theme: any }> {
    try {
      if (!userId || !input?.entityId) {
        throw new GraphQLError("User ID and Entity ID are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Switching account", {
        userId,
        targetEntityId: input.entityId,
        currentSessionId,
      });

      const userRecord = await db.query.user.findFirst({
        where: (u: any, { eq }: any) => eq(u.id, userId),
      });

      if (!userRecord) {
        throw new GraphQLError("User not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const targetUserRecord = await db.query.user.findFirst({
        where: (u: any, { eq }: any) =>
          and(
            eq(u.entityId, input.entityId),
            eq(u.thricoId, userRecord.thricoId),
          ),
        with: {
          entity: true,
          userEntity: true,
        },
      });

      const entity = targetUserRecord?.userEntity;

      if (!entity) {
        throw new GraphQLError("User not found in target entity.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const themeResult = await EntityThemeModel.query("entity")
        .eq(input.entityId)
        .exec();

      const themeData = themeResult.toJSON()[0] || null;

      // Clear old session if sessionId is provided
      if (currentSessionId) {
        try {
          await USER_LOGIN_SESSION.delete({ id: currentSessionId });
          log.debug("Old session cleared during switchAccount", {
            sessionId: currentSessionId,
          });
        } catch (err: any) {
          log.warn("Failed to clear old session during switchAccount", {
            sessionId: currentSessionId,
            error: err.message,
          });
          // Continue execution even if session deletion fails
        }
      }

      const sessionId = `session-${Date.now()}`;

      // Use helper or Model directly
      let loginSession = await LoginSessionModel.create({
        id: sessionId,
        userId: entity.id,
        device_id: input.device_id,
        deviceToken: input.deviceToken,
        deviceName: input.deviceName,
        activeEntityId: input.entityId,
        token: uuidv4(),
      });

      // Generate JWT token using injected function
      const token = await generateJwtTokenFn({
        sessionId: loginSession.id || loginSession.toJSON().id,
        entityId: input.entityId,
        userId: entity.userId,
        id: entity.id,
        country: "IND", // TODO: Determine country dynamically
      });

      log.info("Account switched successfully", {
        userId,
        targetEntityId: input.entityId,
        newUserId: entity.id,
      });

      return {
        token,
        theme: themeData,
      };
    } catch (error) {
      log.error("Error in switchAccount", {
        error,
        userId,
        targetEntityId: input?.entityId,
      });
      throw error;
    }
  }

  static async updateProfileAvatar({
    entityId,
    id,
    db,
    userId,
    input,
    uploadImageFn,
  }: {
    entityId: string;
    id: string;
    db: any;
    userId: string;
    input: any;
    uploadImageFn: (entityId: string, files: any[]) => Promise<any[]>;
  }) {
    try {
      if (!entityId || !userId || !input?.avatar) {
        throw new GraphQLError("Entity ID, User ID, and avatar are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating profile avatar", { entityId, userId });

      const { avatar } = input;
      const image = await uploadImageFn(entityId, [avatar]);

      await db
        .update(user)
        .set({ avatar: image[0].url })
        .where(eq(user.id, userId));

      log.info("Profile avatar updated", {
        entityId,
        userId,
        avatarUrl: image[0].url,
      });

      return this.getUser({ entityId, id, db });
    } catch (error) {
      log.error("Error in updateProfileAvatar", { error, entityId, userId });
      throw error;
    }
  }

  static async updateProfileDetails({
    db,
    input,
    userId,
    entityId,
    id,
  }: {
    db: any;
    input: any;
    userId: string;
    entityId: string;
    id: string;
  }) {
    try {
      if (!userId || !entityId || !input) {
        throw new GraphQLError("User ID, Entity ID, and input are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating profile details", { userId, entityId, input });

      await db
        .update(user)
        .set({
          firstName: input?.firstName,
          lastName: input?.lastName,
          location: input?.location,
        })
        .where(eq(user.id, userId));

      await db
        .update(aboutUser)
        .set({
          headline: input?.headline,
        })
        .where(eq(aboutUser.userId, userId))
        .returning();

      log.info("Profile details updated", { userId, entityId });

      return this.getUser({ entityId, id, db });
    } catch (error) {
      log.error("Error in updateProfileDetails", { error, userId, entityId });
      throw error;
    }
  }

  static async updateProfileCover({
    entityId,
    id,
    db,
    userId,
    input,
    uploadImageFn,
  }: {
    entityId: string;
    id: string;
    db: any;
    userId: string;
    input: any;
    uploadImageFn: (entityId: string, files: any[]) => Promise<any[]>;
  }) {
    try {
      if (!entityId || !userId || !input?.cover) {
        throw new GraphQLError("Entity ID, User ID, and cover are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating profile cover", { entityId, userId });

      const { cover } = input;
      const image = await uploadImageFn(entityId, [cover]);

      await db
        .update(user)
        .set({ cover: image[0].url })
        .where(eq(user.id, userId));

      log.info("Profile cover updated", {
        entityId,
        userId,
        coverUrl: image[0].url,
      });

      return this.getUser({ entityId, id, db });
    } catch (error) {
      log.error("Error in updateProfileCover", { error, entityId, userId });
      throw error;
    }
  }

  // --- New Methods ported from Mobile Service ---

  static async loginWithEmail({
    input,
    sendOtpFn,
  }: {
    input: any;
    sendOtpFn: (user: any) => Promise<any>;
  }) {
    try {
      const findUser = await USER.query("email").eq(input?.email).exec();

      if (findUser.count === 0) {
        throw new GraphQLError("User Not Found", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }
      const output = await sendOtpFn(findUser[0].toJSON());

      return {
        id: output?.id,
        email: input.email,
      };
    } catch (error) {
      log.error("Error in loginWithEmail", { error, email: input?.email });
      throw error;
    }
  }

  static async signupWithEmail({
    input,
    sendOtpFn,
  }: {
    input: any;
    sendOtpFn: (user: any) => Promise<any>;
  }) {
    try {
      const { firstName, lastName, email } = input;

      const findUser = await USER.query("email").eq(input?.email).exec();
      if (findUser.count === 0) {
        const newUser = {
          email,
          firstName,
          lastName,
          role: "manager",
          password: uuidv4(),
          id: uuidv4(),
          loginType: "email",
        };
        const createdUser = await USER.create(newUser);
        const output = await sendOtpFn(createdUser);

        return {
          id: output?.id,
          email: input.email,
        };
      } else {
        const output = await sendOtpFn(findUser[0].toJSON());

        return {
          id: output?.id,
          email: input.email,
        };
      }
    } catch (error) {
      log.error("Error in signupWithEmail", { error, email: input?.email });
      throw error;
    }
  }

  static async loginByOtp({
    input,
    decryptOtpFn,
  }: {
    input: any;
    decryptOtpFn: (otp: string) => Promise<string>;
  }) {
    try {
      const check = await OTP.query("id").eq(input.id).exec();
      if (check.count === 0) {
        throw new GraphQLError("Otp Expired", {
          extensions: {
            code: "NOT FOUND",
            http: { status: 400 },
          },
        });
      }
      const otpDetails = check[0].toJSON();
      const decryptedOtp = await decryptOtpFn(otpDetails.otp);
      if (decryptedOtp !== input.otp) {
        throw new GraphQLError("Invalid Otp", {
          extensions: {
            code: "NOT FOUND",
            http: { status: 400 },
          },
        });
      }

      return {
        id: otpDetails.userId,
      };
    } catch (error) {
      log.error("Error in loginByOtp", { error, otpId: input.id });
      throw error;
    }
  }

  static async chooseAccount({
    input,
    db,
    generateJwtTokenFn,
  }: {
    input: any;
    db: any;
    generateJwtTokenFn: (data: any) => Promise<string>;
  }): Promise<{ token: string; theme: any }> {
    try {
      const thricoUser = await db.query.user.findFirst({
        where: and(
          eq(user.thricoId, input.userId),
          eq(user.entityId, input.entityId),
        ),
        with: {
          entity: true,
        },
      });

      if (!thricoUser) {
        throw new GraphQLError("User not found", {
          extensions: { code: 404, http: { status: 404 } },
        });
      }

      const entity = await db.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity?.userId, thricoUser.id),
          eq(userToEntity?.entityId, input.entityId),
        ),
        with: {
          entity: true,
        },
      });

      if (!entity) {
        throw new GraphQLError("Something went wrong", {
          extensions: {
            code: 400,
            http: { status: 400 },
          },
        });
      }

      const themeResult = await ENTITY_THEME.query("entity")
        .eq(input?.entityId)
        .exec();
      const sessionID = `session-${Date.now()}`;

      const createLoginSession = await USER_LOGIN_SESSION.create({
        id: sessionID,
        userId: entity.userId,
        device_id: input.device_id,
        deviceToken: input.deviceToken,
        deviceName: input.deviceName,
        activeEntityId: input.entityId,
        token: uuidv4(),
      });

      const generate = await generateJwtTokenFn({
        sessionId: createLoginSession.toJSON().id,
        entityId: input.entityId,
        userId: entity.userId,
        id: entity.id,
        country: input.country,
      });

      console.log("generate", generate, input);
      this.updateSession({
        sessionId: sessionID,
        input: {
          deviceToken: input.deviceToken,
          deviceId: input.device_id,
          deviceOs: input.deviceOs,
          activeEntityId: input.entityId,
        },
      });

      return {
        token: generate,
        theme: themeResult.toJSON()[0] ? themeResult.toJSON()[0] : null,
      };
    } catch (error) {
      log.error("Error in chooseAccount", { error, userId: input.userId });
      throw error;
    }
  }

  static async chooseAccountSignup({
    input,
    db,
    generateJwtTokenFn,
  }: {
    input: any;
    db: any;
    generateJwtTokenFn: (data: any) => Promise<string>;
  }): Promise<{ token: string; theme: any }> {
    try {
      const existingUserResult = await USER.query("id").eq(input.userId).exec();
      const userDetails = existingUserResult?.toJSON?.()[0];
      if (!userDetails) {
        throw new GraphQLError("User not found", {
          extensions: { code: 404, http: { status: 404 } },
        });
      }

      // Use transaction to create user and related records
      // db is expected to be a drizzle instance
      await db.transaction(async (tx: any) => {
        const [createdUser] = await tx
          .insert(user)
          .values({
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
            avatar: "default_image_male.png",
            thricoId: userDetails.id,
            entityId: input.entityId,
          })
          .returning();

        await tx.insert(aboutUser).values({
          headline: "Community Member",
          userId: createdUser.id,
        });

        await tx.insert(userToEntity).values({
          userId: createdUser.id,
          entityId: input.entityId,
        });

        await tx.insert(userProfile).values({
          country: input.country || "India",
          userId: createdUser.id,
        });
      });

      const thricoUser = await db.query.user.findFirst({
        where: and(
          eq(user.thricoId, input.userId),
          eq(user.entityId, input.entityId),
        ),
        with: {
          entity: true,
        },
      });

      const entity = await db.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity.userId, thricoUser.id),
          eq(userToEntity.entityId, input.entityId),
        ),
        with: {
          entity: true,
        },
      });

      if (!entity) {
        throw new GraphQLError("User-entity relation not found", {
          extensions: { code: 400, http: { status: 400 } },
        });
      }

      const themeResult = await EntityThemeModel.query("entity")
        .eq(input.entityId)
        .exec();
      const themeData = themeResult?.toJSON?.()[0] || null;

      const sessionId = `session-${Date.now()}`;
      const loginSession = await LoginSessionModel.create({
        id: sessionId,
        userId: entity.id,
        device_id: input.device_id,
        deviceToken: input.deviceToken,
        deviceName: input.deviceName,
        activeEntityId: input.entityId,
        token: uuidv4(),
      });

      const token = await generateJwtTokenFn({
        sessionId: loginSession.toJSON().id,
        entityId: input.entityId,
        userId: entity.userId,
        id: entity.id,
        country: input.country,
      });

      return {
        token,
        theme: themeData,
      };
    } catch (error) {
      log.error("Error in chooseAccountSignup", {
        error,
        userId: input.userId,
      });
      throw error;
    }
  }

  static async checkUserEntity({ input, db }: { input: any; db: any }) {
    try {
      const findOrgIndia = await db.query.user.findMany({
        where: and(eq(user.thricoId, input.id)),
        with: {
          userEntity: true,
          entity: true,
        },
      });

      const arr = [...findOrgIndia].filter(
        (value: any, index: any, self: any) =>
          index ===
          self.findIndex(
            (t: any) =>
              t.entity?.id === value.entity?.id &&
              t.userEntity?.lastActive === value.userEntity?.lastActive,
          ),
      );

      console.log(arr);
      return arr
        .filter((set: any) => set.entity && set.userEntity)
        .map((set: any) => ({
          ...set.entity,
          lastActive: set.userEntity.lastActive,
        }));
    } catch (error) {
      log.error("Error in checkUserEntity", { error, id: input.id });
      throw error;
    }
  }

  static async checkUserEntitySignup({ input, db }: { input: any; db: any }) {
    try {
      const findOrgIndia = await db.query.user.findMany({
        where: and(eq(user.thricoId, input.id)),
        with: {
          userEntity: true,
          entity: true,
        },
      });

      const entity = await db.query.entity.findMany({});

      return entity.map((set: any) => ({
        id: set.id,
        name: set.name,
        logo: set.logo,
        lastActive: null,
        isMember: findOrgIndia.some((f: any) => f.entityId === set.id),
      }));
    } catch (error) {
      log.error("Error in checkUserEntitySignup", { error, id: input.id });
      throw error;
    }
  }

  static async checkOtpId({ input }: { input: any }): Promise<any> {
    try {
      const check = await OTP.query("id").eq(input.id).exec();

      if (!check || check.count === 0) {
        throw new GraphQLError("Otp Expired", {
          extensions: {
            code: 403,
            http: { status: 403 },
          },
        });
      }

      return check[0].toJSON();
    } catch (error) {
      log.error("Error in checkOtpId", { error, otpId: input?.id });
      throw error;
    }
  }

  static async getOrgDetails({ entityId, db }: { entityId: string; db: any }) {
    try {
      const check = await db.query.entity.findFirst({
        where: (d: any, { eq }: any) => eq(d.id, entityId),
      });

      return { ...check };
    } catch (error) {
      log.error("Error in getOrgDetails", { error, entityId });
      throw error;
    }
  }

  static async checkSubscription({
    entityId,
    checkEntitySubscriptionFn,
  }: {
    entityId: string;
    checkEntitySubscriptionFn: (entityId: string) => Promise<any>;
  }) {
    try {
      const subscription = await checkEntitySubscriptionFn(entityId);

      // Ensure all modules have enabled: true
      if (subscription?.modules && Array.isArray(subscription.modules)) {
        subscription.modules = subscription.modules.filter(
          (mod: any) => mod.enabled === true,
        );
      }
      return subscription;
    } catch (error) {
      log.error("Error in checkSubscription", { error, entityId });
      throw error;
    }
  }

  static async checkUserOnline({ id, db }: { id: string; db: any }) {
    try {
      await db
        .update(userToEntity)
        .set({ lastActive: sql`now()` })
        .where(eq(userToEntity.id, id))
        .returning();
      return {
        status: true,
      };
    } catch (error) {
      log.error("Error in checkUserOnline", { error, id });
      throw error;
    }
  }

  static async getEntityTheme({ entityId, db }: { entityId: string; db: any }) {
    try {
      const entityTheme = await db.query.theme.findFirst({
        where: and(eq(theme.entityId, entityId)),
      });
      return entityTheme;
    } catch (error) {
      log.error("Error in getEntityTheme", { error, entityId });
      throw error;
    }
  }

  static async updateSession({
    sessionId,
    input,
  }: {
    sessionId: string;
    input: {
      deviceToken?: string;
      deviceId?: string;
      deviceOs?: string;
      activeEntityId?: string;
    };
  }) {
    console.log("Updating session", { sessionId, input });
    try {
      if (!sessionId) {
        throw new GraphQLError("Session ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Updating session", { sessionId, input });

      const session = await USER_LOGIN_SESSION.get(sessionId);
      if (!session) {
        throw new GraphQLError("Session not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const updateData: any = {};
      if (input.deviceToken !== undefined)
        updateData.deviceToken = input.deviceToken;
      if (input.deviceId !== undefined) updateData.deviceId = input.deviceId;
      if (input.deviceOs !== undefined) updateData.deviceOs = input.deviceOs;
      if (input.activeEntityId !== undefined)
        updateData.activeEntityId = input.activeEntityId;

      await USER_LOGIN_SESSION.update({ id: sessionId }, updateData);

      log.info("Session updated successfully", { sessionId });
      return { success: true };
    } catch (error) {
      log.error("Error in updateSession", { error, sessionId });
      throw error;
    }
  }

  static async logoutUser({ sessionId }: { sessionId: string }) {
    try {
      if (!sessionId) {
        throw new GraphQLError("Session ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Logging out user", { sessionId });

      const session = await USER_LOGIN_SESSION.get(sessionId);
      if (!session) {
        throw new GraphQLError("Session not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Delete the session to clear token and session data
      await USER_LOGIN_SESSION.delete({ id: sessionId });

      log.info("User logged out successfully", { sessionId });
      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      log.error("Error in logoutUser", { error, sessionId });
      throw error;
    }
  }
}
