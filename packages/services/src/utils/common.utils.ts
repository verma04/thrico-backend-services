import { entitySettingsGroups, entity, userToEntity } from "@thrico/database";
import { eq } from "drizzle-orm";
import { log } from "@thrico/logging";

export const getUserOrgDetails = async ({
  entityId,
  db,
}: {
  entityId: string;
  db: any;
}) => {
  try {
    const entityRecord = await db.query.entity.findFirst({
      where: (e: any, { eq }: any) => eq(e.id, entityId),
    });

    const orgData = {
      name: entityRecord?.name,
      logo: `https://cdn.thrico.network/${entityRecord.logo}`,
    };

    return orgData;
  } catch (error) {
    log.error("Error in getUserOrgDetails", { error });
    throw error;
  }
};

export const getUserDetails = async ({
  userId,
  db,
}: {
  userId: string;
  db: any;
}) => {
  try {
    const user = await db.query.userToEntity.findFirst({
      where: (userToEntity: any, { eq }: any) => eq(userToEntity.id, userId),
      with: {
        user: true,
      },
    });

    const userData = {
      email: user?.user.email,
      firstName: user?.user.firstName,
      lastName: user?.user.lastName,
    };

    return userData;
  } catch (error) {
    log.error("Error in getUserDetails", { error });
    throw error;
  }
};

export const communtiesSettings = async ({
  entityId,
  db,
}: {
  entityId: string;
  db: any;
}) => {
  try {
    const settings = await db.query.entitySettingsGroups.findFirst({
      where: (entitySettingsGroups: any, { eq }: any) =>
        eq(entitySettingsGroups.entity, entityId),
    });
    return settings;
  } catch (error) {
    log.error("Error in communtiesSettings", { error });
    throw error;
  }
};
