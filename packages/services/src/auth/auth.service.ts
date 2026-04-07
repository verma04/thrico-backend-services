import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { UserService } from "../user/user.service";

import {
  and,
  eq,
  sql,
  desc,
  lt,
  or,
  isNull,
  SQL,
  asc,
  isNotNull,
} from "drizzle-orm";
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
  entity,
  gender,
  entitySettings,
  status,
} from "@thrico/database";
import { v4 as uuidv4 } from "uuid";
import { StorageService } from "../storage/storage.service";

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

      const profile = await db.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity?.id, id),
          eq(userToEntity?.entityId, entityId),
        ),
        with: {
          user: {
            with: {
              about: true,
              profile: true,
            },
          },
        },
      });

      if (!profile) {
        throw new GraphQLError("Permission denied.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (!profile?.user) {
        throw new GraphQLError("User profile not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      log.info("User retrieved", { entityId, id, userId: profile.user.id });
      return {
        ...profile.user,
        id: profile.id,
        status: profile?.status,
        isApproved: profile?.isApproved,
        isRequested: profile?.isRequested,
      };
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
  }): Promise<{
    token: string;
    theme: any;
    isDeletionPending?: boolean;
    deletionRequestedAt?: Date | null;
    isActive?: boolean;
  }> {
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

      // Get old session details if sessionId is provided
      let oldSessionDetails: any = null;
      if (currentSessionId) {
        try {
          const sessionResult = await USER_LOGIN_SESSION.query("id")
            .eq(currentSessionId)
            .exec();
          if (sessionResult.count > 0) {
            oldSessionDetails = sessionResult[0].toJSON();
          }
        } catch (e) {
          log.warn("Failed to fetch old session details", { error: e });
        }

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

      const deviceId = oldSessionDetails?.device_id;
      const deviceToken = oldSessionDetails?.deviceToken;
      const deviceName = oldSessionDetails?.deviceName;

      console.log({
        oldSessionDetails,
        id: sessionId,
        userId: entity.userId,
        device_id: deviceId,
        deviceToken: deviceToken,
        deviceName: deviceName,
        activeEntityId: input.entityId,
        token: uuidv4(),
      });
      // Use helper or Model directly
      await USER_LOGIN_SESSION.create({
        id: sessionId,
        userId: entity.userId,
        device_id: deviceId,
        deviceToken: deviceToken,
        deviceName: deviceName,
        activeEntityId: input.entityId,
        token: uuidv4(),
      });

      //  Generate JWT token using injected function
      const token = await generateJwtTokenFn({
        sessionId: sessionId,
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
        isDeletionPending: targetUserRecord.isDeletionPending,
        deletionRequestedAt: targetUserRecord.deletionRequestedAt,
        isActive: targetUserRecord.isActive,
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

      // Get old avatar to cleanup storage
      const oldUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { avatar: true },
      });

      const image = await uploadImageFn(entityId, [avatar]);

      await db
        .update(user)
        .set({ avatar: image[0].url })
        .where(eq(user.id, userId));

      // Track storage usage
      try {
        if (image && image[0] && image[0].url) {
          await StorageService.trackUploadedFile(
            image[0].url,
            entityId,
            "USER",
            userId,
            db,
          );
        }
      } catch (storageError) {
        log.error("Failed to track profile avatar storage usage", {
          storageError,
          userId,
          entityId,
        });
      }

      // Cleanup old avatar from storage
      if (oldUser?.avatar) {
        await StorageService.unTrackFileByUrl(oldUser.avatar, db).catch(
          (err) => {
            log.warn("Failed to untrack old avatar", {
              error: err,
              url: oldUser.avatar,
            });
          },
        );
      }

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

      // Get old cover to cleanup storage
      const oldUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { cover: true },
      });

      const image = await uploadImageFn(entityId, [cover]);

      await db
        .update(user)
        .set({ cover: image[0].url })
        .where(eq(user.id, userId));

      // Track storage usage
      try {
        if (image && image[0] && image[0].url) {
          await StorageService.trackUploadedFile(
            image[0].url,
            entityId,
            "USER",
            userId,
            db,
          );
        }
      } catch (storageError) {
        log.error("Failed to track profile cover storage usage", {
          storageError,
          userId,
          entityId,
        });
      }

      // Cleanup old cover from storage
      if (oldUser?.cover) {
        await StorageService.unTrackFileByUrl(oldUser.cover, db).catch(
          (err) => {
            log.warn("Failed to untrack old cover", {
              error: err,
              url: oldUser.cover,
            });
          },
        );
      }

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
      const { email } = input;

      const findUser = await USER.query("email").eq(input?.email).exec();
      if (findUser.count === 0) {
        const newUser = {
          email,
          firstName: "",
          lastName: "",
          role: "manager",
          password: uuidv4(),
          id: uuidv4(),
          loginType: "email",
          gender: "male",
          dob: "",
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
  }): Promise<any> {
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
  }): Promise<{
    token: string;
    theme: any;
    isDeletionPending?: boolean;
    deletionRequestedAt?: Date | null;
    isActive?: boolean;
  }> {
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
        isDeletionPending: thricoUser.isDeletionPending,
        deletionRequestedAt: thricoUser.deletionRequestedAt,
        isActive: thricoUser.isActive,
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
  }): Promise<{
    token: string;
    theme: any;
    isDeletionPending?: boolean;
    deletionRequestedAt?: Date | null;
    isActive?: boolean;
  }> {
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
      let newUserRecord: any;
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
            referredBy: input.referredByCode,
          })
          .returning();

        newUserRecord = createdUser;

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
          gender: userDetails.gender,
          DOB: userDetails.dob,
        });
      });

      // Call referral processing after successful transaction
      if (input.referredByCode && newUserRecord) {
        UserService.processReferral({
          referredByCode: input.referredByCode,
          newUserId: newUserRecord.id,
          entityId: input.entityId,
          db,
        }).catch((e) =>
          log.error("Referral processing failed in chooseAccountSignup", {
            error: e,
          }),
        );
      }


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
        isDeletionPending: thricoUser.isDeletionPending,
        deletionRequestedAt: thricoUser.deletionRequestedAt,
        isActive: thricoUser.isActive,
      };
    } catch (error) {
      log.error("Error in chooseAccountSignup", {
        error,
        userId: input.userId,
      });
      throw error;
    }
  }

  static encodeCursor(data: any) {
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }

  static decodeCursor(cursor: string) {
    try {
      return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
    } catch (e) {
      log.warn("Failed to decode cursor", { cursor, error: e });
      return null;
    }
  }

  static async checkUserEntity({
    input,
    db,
  }: {
    input: any;
    db: any;
  }): Promise<any> {
    try {
      const { id, cursor, limit = 10, searchTerm } = input;
      log.debug("checkUserEntity starting", { id, cursor, limit, searchTerm });

      const whereConditions: SQL[] = [eq(user.thricoId, id) as SQL];

      if (cursor) {
        const decoded = this.decodeCursor(cursor);
        if (decoded) {
          const { lastActive, id: cursorId } = decoded;
          if (lastActive) {
            const condition = or(
              sql`${userToEntity.lastActive} < ${lastActive}`,
              isNull(userToEntity.lastActive),
              and(
                sql`${userToEntity.lastActive} = ${lastActive}`,
                sql`${entity.id} < ${cursorId}`,
              ),
            );
            if (condition) whereConditions.push(condition);
          } else {
            const condition = and(
              isNull(userToEntity.lastActive),
              sql`${entity.id} < ${cursorId}`,
            );
            if (condition) whereConditions.push(condition);
          }
        }
      }

      if (searchTerm) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            searchTerm,
          );
        const searchConditions = [
          sql`${entity.name} ILIKE '%' || ${searchTerm} || '%'`,
          sql`${entity.country}::text ILIKE '%' || ${searchTerm} || '%'`,
          sql`${entity.address} ILIKE '%' || ${searchTerm} || '%'`,
          sql`${entity.website} ILIKE '%' || ${searchTerm} || '%'`,
        ];

        if (isUuid) {
          searchConditions.push(eq(entity.id, searchTerm));
        }

        const condition = or(...searchConditions);
        if (condition) whereConditions.push(condition);
      }

      const results = await db
        .select({
          id: entity.id,
          name: entity.name,
          logo: entity.logo,
          lastActive: userToEntity.lastActive,
          country: entity.country,
          isMember: sql<boolean>`true`,
        })
        .from(user)
        .innerJoin(userToEntity, eq(user.id, userToEntity.userId))
        .innerJoin(entity, eq(userToEntity.entityId, entity.id))
        .where(and(...whereConditions))
        .orderBy(
          sql`${userToEntity.lastActive} DESC NULLS LAST`,
          desc(entity.id),
        )
        .limit(limit + 1);

      const hasNextPage = results.length > limit;
      const nodes = hasNextPage ? results.slice(0, limit) : results;

      return {
        entities: nodes,
        pageInfo: {
          hasNextPage,
          endCursor:
            nodes.length > 0
              ? this.encodeCursor({
                  lastActive: nodes[nodes.length - 1].lastActive,
                  id: nodes[nodes.length - 1].id,
                })
              : null,
        },
      };
    } catch (error) {
      log.error("Error in checkUserEntity", { error, input });
      throw error;
    }
  }

  static async checkUserEntitySignup({
    input,
    db,
  }: {
    input: any;
    db: any;
  }): Promise<any> {
    try {
      const { id, cursor, limit = 10, searchTerm } = input;
      log.debug("checkUserEntitySignup starting", {
        id,
        cursor,
        limit,
        searchTerm,
      });

      const whereConditions: SQL[] = [];

      const isMemberSql = sql<boolean>`CASE WHEN ${userToEntity.id} IS NOT NULL THEN true ELSE false END`;

      if (cursor) {
        const decoded = this.decodeCursor(cursor);
        if (decoded) {
          const { isMember, lastActive, id: cursorId } = decoded;
          if (isMember === false) {
            whereConditions.push(
              or(
                and(isNull(userToEntity.id), sql`${entity.id} < ${cursorId}`),
                isNotNull(userToEntity.id),
              ) as SQL,
            );
          } else {
            const condition = or(
              sql`${userToEntity.lastActive} < ${lastActive}`,
              isNull(userToEntity.lastActive),
              and(
                sql`${userToEntity.lastActive} = ${lastActive}`,
                sql`${entity.id} < ${cursorId}`,
              ),
            );
            if (condition) {
              whereConditions.push(
                and(isNotNull(userToEntity.id), condition) as SQL,
              );
            } else {
              whereConditions.push(isNotNull(userToEntity.id));
            }
          }
        }
      }

      if (searchTerm) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            searchTerm,
          );
        const searchConditions = [
          sql`${entity.name} ILIKE '%' || ${searchTerm} || '%'`,
          sql`${entity.country}::text ILIKE '%' || ${searchTerm} || '%'`,
          sql`${entity.address} ILIKE '%' || ${searchTerm} || '%'`,
          sql`${entity.website} ILIKE '%' || ${searchTerm} || '%'`,
        ];

        if (isUuid) {
          searchConditions.push(eq(entity.id, searchTerm));
        }

        const condition = or(...searchConditions);
        if (condition) whereConditions.push(condition);
      }

      const entityList = await db
        .select({
          id: entity.id,
          name: entity.name,
          logo: entity.logo,
          lastActive: userToEntity.lastActive,
          country: entity.country,
          isMember: isMemberSql,
        })
        .from(entity)
        .leftJoin(
          user,
          and(eq(user.thricoId, id), eq(user.entityId, entity.id)),
        )
        .leftJoin(userToEntity, eq(user.id, userToEntity.userId))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(
          asc(isMemberSql),
          sql`${userToEntity.lastActive} DESC NULLS LAST`,
          desc(entity.id),
        )
        .limit(limit + 1);

      const hasNextPage = entityList.length > limit;
      const nodes = hasNextPage ? entityList.slice(0, limit) : entityList;

      return {
        entities: nodes,
        pageInfo: {
          hasNextPage,
          endCursor:
            nodes.length > 0
              ? this.encodeCursor({
                  isMember: nodes[nodes.length - 1].isMember,
                  lastActive: nodes[nodes.length - 1].lastActive,
                  id: nodes[nodes.length - 1].id,
                })
              : null,
        },
      };
    } catch (error) {
      log.error("Error in checkUserEntitySignup", { error, input });
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

  static async getOrgDetails({
    entityId,
    db,
  }: {
    entityId: string;
    db: any;
  }): Promise<any> {
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

  static async checkUserOnline({
    id,
    db,
  }: {
    id: string;
    db: any;
  }): Promise<any> {
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

  static async getEntityTheme({
    entityId,
    db,
  }: {
    entityId: string;
    db: any;
  }): Promise<any> {
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
  }): Promise<any> {
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

  static async logoutUser({ sessionId }: { sessionId: string }): Promise<any> {
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

  static async getSignupProfile({ id }: { id: string }): Promise<any> {
    try {
      if (!id) {
        throw new GraphQLError("ID is required", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      const existingUserResult = await USER.query("id").eq(id).exec();
      const userDetails = existingUserResult?.toJSON?.()[0];
      if (!userDetails) {
        throw new GraphQLError("Profile not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      return {
        id: userDetails.id,
        email: userDetails.email,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        avatar: userDetails.avatar || "defaultAvatar.png",
        profile: {
          gender: userDetails.gender,
          DOB: userDetails.dob,
        },
      };
    } catch (error) {
      log.error("Error in getSignupProfile", { error, id });
      throw error;
    }
  }

  static async createProfile({
    input,
    db,
    generateJwtTokenFn,
  }: {
    input: any;
    db: any;
    generateJwtTokenFn: (data: any) => Promise<string>;
  }): Promise<{
    token: string;
    theme: any;
    isDeletionPending?: boolean;
    deletionRequestedAt?: Date | null;
    isActive?: boolean;
  }> {
    try {
      const {
        userId,
        entityId,
        firstName,
        lastName,
        dob,
        phone,
        headline,
        about,
        location,
        socialLinks,
        deviceName,
        device_id,
        deviceToken,
        country,
      } = input;

      // Fetch entity settings to check for autoApproveUser
      const settings = await db.query.entitySettings.findFirst({
        where: eq(entitySettings.entity, entityId),
      });

      const isAutoApprove = settings?.autoApproveUser ?? true;
      const userStatus = isAutoApprove ? "APPROVED" : "PENDING";
      const isApproved = isAutoApprove;
      const isActive = isAutoApprove;

      const existingUserResult = await USER.query("id").eq(userId).exec();
      const userDetails = existingUserResult?.toJSON?.()[0];
      if (!userDetails) {
        throw new GraphQLError("User not found", {
          extensions: { code: 404, http: { status: 404 } },
        });
      }

      // Update global user info in DynamoDB
      await USER.update(
        { id: userId },
        {
          firstName,
          lastName,
          dob,
          about,
        },
      );

      // Use transaction to create/update Postgres records
      let newUserRecord: any;
      await db.transaction(async (tx: any) => {
        // Create user record in the entity context
        const [createdUser] = await tx
          .insert(user)
          .values({
            email: userDetails.email,
            firstName,
            lastName,
            avatar: userDetails.avatar || "defaultAvatar.png",
            thricoId: userId,
            entityId: entityId,
            location: location,
            isActive: isActive,
            referredBy: input.referredByCode,
          })
          .returning();

        newUserRecord = createdUser;

        // Create about record
        await tx.insert(aboutUser).values({
          headline: headline || "Community Member",
          about: about,
          userId: createdUser.id,
          social: socialLinks,
        });

        // Create profile record
        await tx.insert(userProfile).values({
          country: country || "India",
          userId: createdUser.id,
          gender: userDetails.gender,
          DOB: dob,
          phone: phone ? { phoneNumber: phone } : null,
        });

        // Link user to entity
        await tx.insert(userToEntity).values({
          userId: createdUser.id,
          entityId: entityId,
          lastActive: sql`now()`,
          isApproved: isApproved,
          status: userStatus,
        });
      });

      // Process referral after successful transaction
      if (input.referredByCode && newUserRecord) {
        UserService.processReferral({
          referredByCode: input.referredByCode,
          newUserId: newUserRecord.id,
          entityId: entityId,
          db,
        }).catch((e) =>
          log.error("Referral processing failed in createProfile", {
            error: e,
          }),
        );
      }


      // Fetch the newly created records for session generation
      const thricoUser = await db.query.user.findFirst({
        where: and(eq(user.thricoId, userId), eq(user.entityId, entityId)),
      });

      const entityRel = await db.query.userToEntity.findFirst({
        where: and(
          eq(userToEntity.userId, thricoUser.id),
          eq(userToEntity.entityId, entityId),
        ),
      });

      const themeResult = await EntityThemeModel.query("entity")
        .eq(entityId)
        .exec();
      const themeData = themeResult?.toJSON?.()[0] || null;

      const sessionId = `session-${Date.now()}`;
      const loginSession = await LoginSessionModel.create({
        id: sessionId,
        userId: entityRel.id,
        device_id: device_id,
        deviceToken: deviceToken,
        deviceName: deviceName,
        activeEntityId: entityId,
        token: uuidv4(),
      });

      const token = await generateJwtTokenFn({
        sessionId: loginSession.toJSON().id,
        entityId: entityId,
        userId: entityRel.userId,
        id: entityRel.id,
        country: country,
      });

      return {
        token,
        theme: themeData,
        isDeletionPending: thricoUser.isDeletionPending,
        deletionRequestedAt: thricoUser.deletionRequestedAt,
        isActive: thricoUser.isActive,
      };
    } catch (error) {
      log.error("Error in createProfile", { error, userId: input.userId });
      throw error;
    }
  }
}
