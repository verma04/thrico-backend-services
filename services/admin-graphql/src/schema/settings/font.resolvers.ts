import { ENTITY_FONT } from "@thrico/database";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";

export const fontResolvers = {
  Query: {
    // async getCustomDomain(_: any, {}: any, context: any) {
    //   try {
    //     const { entity } = await checkAuth(context);
    //     const findDomain = await CUSTOM_DOMAIN.query("entity")
    //       .eq(entity)
    //       .exec();
    //     if (findDomain[0]?.toJSON()) return findDomain[0]?.toJSON();
    //     else [];
    //   } catch (error) {
    //     console.log(error);
    //     throw error;
    //   }
    // },
  },
  Mutation: {
    async updateFont(_: any, { input }: any, context: any) {
      try {
        const { id, entity } = await checkAuth(context);

        const { name, weights, styles, subsets } = input;
        const findDomain = await ENTITY_FONT.query("entity").eq(entity).exec();

        log.info("Updating font with data:", { name, weights, styles, subsets });
        if (findDomain.count !== 0) {
          const updateFont = await ENTITY_FONT.update(
            { entity },
            {
              $SET: {
                name,
                weights: weights,
                styles: styles,
                subsets: subsets,
              },
            }
          );
          log.info("Update font result:", updateFont?.toJSON ? updateFont.toJSON() : updateFont);
        } else {
          const newFont = await ENTITY_FONT.create({
            entity,
            name,
            weights: weights,
            styles: styles,
            subsets: subsets,
          });

          log.info("New font created:", newFont.toJSON());
        }
      } catch (error) {
        log.error("Catch error:", error);
        throw error;
      }
    },
  },
};
