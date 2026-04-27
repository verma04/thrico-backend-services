import { log } from "@thrico/logging";
import { GraphQLError } from "graphql";
import { ENTITY_THEME } from "@thrico/database";

export class EntityService {
  static async getEntityTheme({
    entityId,
  }: {
    entityId: string;
  }): Promise<any> {
    try {
      if (!entityId) {
        throw new GraphQLError("Entity ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Getting entity theme", { entityId });

      const theme = await ENTITY_THEME.query("entity").eq(entityId).exec();
      const themeData = theme.toJSON()[0] || null;

      log.info("Entity theme retrieved", { entityId, themeFound: !!themeData });

      if (themeData === null || themeData === undefined) {
        return {
          backgroundColor: "#ffffff",
          borderColor: "#313335",
          borderRadius: 6,
          borderStyle: "solid",
          borderWidth: 1,
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          buttonColor: "#3b82f6",
          fontSize: 13,
          fontWeight: "400",
          hoverEffect: "none",
          inputBackground: "#ffffff",
          inputBorderColor: "#cbd5e1",
          primaryColor: "#3b82f6",
          secondaryColor: "#8b5cf6",
          textColor: "#0f172a",
        };
      }

      return themeData;
    } catch (error) {
      log.error("Error in getEntityTheme", { error, entityId });
      throw error;
    }
  }

  static async editEntityTheme({
    entityId,
    input,
  }: {
    entityId: string;
    input: any;
  }): Promise<any> {
    try {
      if (!entityId) {
        throw new GraphQLError("Entity ID is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      log.debug("Editing entity theme", { entityId, input });

      const existingThemeResult = await ENTITY_THEME.query("entity")
        .eq(entityId)
        .exec();

      if (existingThemeResult.count > 0) {
        const themeItem = existingThemeResult[0];

        await ENTITY_THEME.update(
          { id: themeItem.id },
          {
            $SET: {
              ...input,
              entity: entityId,
            },
          },
        );
      } else {
        // Create new item — id will be auto-generated
        await ENTITY_THEME.create({
          ...input,
          entity: entityId,
        });
      }

      log.info("Entity theme updated", { entityId });
      return { success: true };
    } catch (error) {
      log.error("Error in editEntityTheme", { error, entityId });
      throw error;
    }
  }
}
