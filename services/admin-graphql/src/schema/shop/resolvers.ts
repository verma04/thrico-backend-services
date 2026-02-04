//
// This file contains the Shop GraphQL resolvers
// Copy this to: /Users/pulseplay/thrico/thrico-backend/services/admin-graphql/src/schema/shop/resolvers.ts
//

import {
  shopProducts,
  shopProductMedia,
  shopProductVariants,
  shopProductOptions,
  shopBanners,
} from "@thrico/database";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { logger } from "@thrico/logging";
import upload from "../../utils/upload/upload";
import { seedShopProducts } from "src/seed/seedShopProducts";

export const shopResolvers = {
  Query: {
    // Get all shop products
    async getShopProducts(_: any, { filter, pagination }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const conditions = [eq(shopProducts.entity, entity)];

        if (filter) {
          if (filter.status) {
            conditions.push(eq(shopProducts.status, filter.status));
          }
          if (filter.category) {
            conditions.push(eq(shopProducts.category, filter.category));
          }
        }

        const limit = pagination?.limit || 50;
        const offset = pagination?.offset || 0;

        return await db.query.shopProducts.findMany({
          where: and(...conditions),
          limit,
          offset,
          orderBy: desc(shopProducts.createdAt),
          with: {
            media: true,
            variants: true,
            options: true,
          },
        });
      } catch (error: any) {
        logger.error(`Error in getShopProducts: ${error.message}`, { error });
        throw error;
      }
    },

    // Get single shop product by ID
    async getShopProduct(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const product = await db.query.shopProducts.findFirst({
          where: and(eq(shopProducts.id, id), eq(shopProducts.entity, entity)),
          with: {
            media: true,
            variants: true,
            options: true,
          },
        });

        if (!product) {
          throw new GraphQLError("Product not found");
        }

        return product;
      } catch (error: any) {
        logger.error(`Error in getShopProduct: ${error.message}`, { error });
        throw error;
      }
    },

    // Get shop banners
    async getShopBanners(_: any, {}: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        return await db.query.shopBanners.findMany({
          where: and(
            eq(shopBanners.entity, entity),
            eq(shopBanners.isActive, true),
          ),
          orderBy: [shopBanners.sortOrder, shopBanners.createdAt],
          with: {
            linkedProduct: {
              with: {
                media: true,
              },
            },
          },
        });
      } catch (error: any) {
        logger.error(`Error in getShopBanners: ${error.message}`, { error });
        throw error;
      }
    },
  },

  Mutation: {
    // Create shop product
    async createShopProduct(_: any, { input }: any, context: any) {
      try {
        const { db, entity, userId } = await checkAuth(context);

        const payload = {
          ...input,
          entity,
          createdBy: userId,
          slug: input.slug || input.title.toLowerCase().replace(/\s+/g, "-"),
        };

        const [newProduct] = await db
          .insert(shopProducts)
          .values(payload)
          .returning();

        if (input.media && input.media.length > 0) {
          const mediaPayload = input.media.map((media: any) => ({
            productId: newProduct.id,
            url: media.url,
            sortOrder: media.sortOrder,
          }));

          await db.insert(shopProductMedia).values(mediaPayload);
        }

        seedShopProducts(db, entity);

        return await db.query.shopProducts.findFirst({
          where: eq(shopProducts.id, newProduct.id),
          with: {
            media: true,
          },
        });
      } catch (error: any) {
        logger.error(`Error in createShopProduct: ${error.message}`, { error });
        throw error;
      }
    },

    // Update shop product
    async updateShopProduct(_: any, { id, input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const payload: any = { ...input, updatedAt: new Date() };
        // Remove fields that don't exist in the database table
        console.log(payload);

        const [updatedProduct] = await db
          .update(shopProducts)
          .set(payload)
          .where(and(eq(shopProducts.id, id), eq(shopProducts.entity, entity)))
          .returning();

        if (!updatedProduct) {
          throw new GraphQLError(
            "Product not found or you do not have permission to update it",
          );
        }

        return await db.query.shopProducts.findFirst({
          where: and(eq(shopProducts.id, id), eq(shopProducts.entity, entity)),
          with: {
            media: true,
            variants: true,
            options: true,
          },
        });
      } catch (error: any) {
        logger.error(`Error in updateShopProduct: ${error.message}`, { error });
        throw error;
      }
    },

    // Delete shop product
    async deleteShopProduct(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [deletedProduct] = await db
          .update(shopProducts)
          .set({ status: "ARCHIVED" })
          .where(and(eq(shopProducts.id, id), eq(shopProducts.entity, entity)))
          .returning();

        if (!deletedProduct) {
          throw new GraphQLError(
            "Product not found or you do not have permission to delete it",
          );
        }

        return true;
      } catch (error: any) {
        logger.error(`Error in deleteShopProduct: ${error.message}`, { error });
        throw error;
      }
    },

    // Create product variant
    async createShopProductVariant(_: any, { input, id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const payload = {
          ...input,
          entity,
          ...(id ? { id } : {}),
        };

        if (input.image) {
          payload.image = await upload(input.image);
        }

        const [newVariant] = await db
          .insert(shopProductVariants)
          .values(payload)
          .returning();

        // Increment numberOfVariants and set hasVariants to true
        await db
          .update(shopProducts)
          .set({
            numberOfVariants: sql`${shopProducts.numberOfVariants} + 1`,
            hasVariants: true,
          })
          .where(eq(shopProducts.id, input.productId));

        return newVariant;
      } catch (error: any) {
        logger.error(`Error in createShopProductVariant: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    // Update product variants (Bulk Sync)
    async updateShopProductVariant(
      _: any,
      { productId, input }: any,
      context: any,
    ) {
      try {
        const { db, entity } = await checkAuth(context);

        // Verify product existence and ownership
        const product = await db.query.shopProducts.findFirst({
          where: and(
            eq(shopProducts.id, productId),
            eq(shopProducts.entity, entity),
          ),
        });

        if (!product) {
          throw new GraphQLError("Product not found");
        }

        return await db.transaction(async (tx: any) => {
          const existingVariants = await tx.query.shopProductVariants.findMany({
            where: and(
              eq(shopProductVariants.productId, productId),
              eq(shopProductVariants.entity, entity),
            ),
          });

          const inputIds = input
            .map((item: any) => item.id)
            .filter((id: any) => !!id);

          // Delete variants not in input list
          const toDelete = existingVariants
            .filter((v: any) => !inputIds.includes(v.id))
            .map((v: any) => v.id);

          if (toDelete.length > 0) {
            await tx
              .delete(shopProductVariants)
              .where(
                and(
                  eq(shopProductVariants.productId, productId),
                  inArray(shopProductVariants.id, toDelete),
                ),
              );
          }

          // Process each variant from input
          for (const item of input) {
            const payload: any = { ...item, updatedAt: new Date() };

            // Handle image upload if it's a new file
            if (item.image && typeof item.image !== "string") {
              payload.image = await upload(item.image);
            }

            if (item.id) {
              // Update existing variant
              delete payload.id; // Don't try to update the ID field itself
              await tx
                .update(shopProductVariants)
                .set(payload)
                .where(
                  and(
                    eq(shopProductVariants.id, item.id),
                    eq(shopProductVariants.entity, entity),
                  ),
                );
            } else {
              // Create new variant
              await tx.insert(shopProductVariants).values({
                ...payload,
                productId,
                entity,
              });
            }
          }

          // Fetch final list after sync
          const finalVariants = await tx.query.shopProductVariants.findMany({
            where: and(
              eq(shopProductVariants.productId, productId),
              eq(shopProductVariants.entity, entity),
            ),
            orderBy: [desc(shopProductVariants.createdAt)],
          });

          // Sync numberOfVariants on product
          await tx
            .update(shopProducts)
            .set({ numberOfVariants: finalVariants.length })
            .where(eq(shopProducts.id, productId));

          return finalVariants;
        });
      } catch (error: any) {
        logger.error(`Error in updateShopProductVariant: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    // Delete product variant
    async deleteShopProductVariant(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [deletedVariant] = await db
          .delete(shopProductVariants)
          .where(
            and(
              eq(shopProductVariants.id, id),
              eq(shopProductVariants.entity, entity),
            ),
          )
          .returning();

        if (!deletedVariant) {
          throw new GraphQLError(
            "Variant not found or you do not have permission to delete it",
          );
        }

        // Decrement numberOfVariants
        await db
          .update(shopProducts)
          .set({
            numberOfVariants: sql`CASE WHEN ${shopProducts.numberOfVariants} > 0 THEN ${shopProducts.numberOfVariants} - 1 ELSE 0 END`,
          })
          .where(eq(shopProducts.id, deletedVariant.productId));

        return true;
      } catch (error: any) {
        logger.error(`Error in deleteShopProductVariant: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    // Create shop banner
    async createShopBanner(_: any, { input }: any, context: any) {
      try {
        const { db, entity, userId } = await checkAuth(context);

        const payload = {
          ...input,
          entity,
          createdBy: userId,
        };

        if (input.image) {
          payload.image = await upload(input.image);
        }

        const [newBanner] = await db
          .insert(shopBanners)
          .values(payload)
          .returning();

        return newBanner;
      } catch (error: any) {
        logger.error(`Error in createShopBanner: ${error.message}`, { error });
        throw error;
      }
    },

    // Update shop banner
    async updateShopBanner(_: any, { id, input }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const payload: any = { ...input, updatedAt: new Date() };

        if (input.image) {
          payload.image = await upload(input.image);
        }

        const [updatedBanner] = await db
          .update(shopBanners)
          .set(payload)
          .where(and(eq(shopBanners.id, id), eq(shopBanners.entity, entity)))
          .returning();

        if (!updatedBanner) {
          throw new GraphQLError(
            "Banner not found or you do not have permission to update it",
          );
        }

        return updatedBanner;
      } catch (error: any) {
        logger.error(`Error in updateShopBanner: ${error.message}`, { error });
        throw error;
      }
    },

    // Delete shop banner
    async deleteShopBanner(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const [deletedBanner] = await db
          .delete(shopBanners)
          .where(and(eq(shopBanners.id, id), eq(shopBanners.entity, entity)))
          .returning();

        if (!deletedBanner) {
          throw new GraphQLError(
            "Banner not found or you do not have permission to delete it",
          );
        }

        return true;
      } catch (error: any) {
        logger.error(`Error in deleteShop Banner: ${error.message}`, { error });
        throw error;
      }
    },

    // Reorder banners
    async reorderShopBanners(_: any, { bannerOrders }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        const updatedBanners = [];
        for (const { id, sortOrder } of bannerOrders) {
          const [updatedBanner] = await db
            .update(shopBanners)
            .set({ sortOrder, updatedAt: new Date() })
            .where(and(eq(shopBanners.id, id), eq(shopBanners.entity, entity)))
            .returning();

          if (!updatedBanner) {
            throw new GraphQLError(
              `Banner with id ${id} not found or you do not have permission to update it.`,
            );
          }

          updatedBanners.push(updatedBanner);
        }

        return updatedBanners;
      } catch (error: any) {
        logger.error(`Error in reorderShopBanners: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    // Update shop product media
    async updateShopProductMedia(
      _: any,
      { productId, media }: any,
      context: any,
    ) {
      try {
        const { db, entity } = await checkAuth(context);

        // Verify product exists and belongs to entity
        const product = await db.query.shopProducts.findFirst({
          where: and(
            eq(shopProducts.id, productId),
            eq(shopProducts.entity, entity),
          ),
        });

        if (!product) {
          throw new GraphQLError("Product not found");
        }

        return await db.transaction(async (tx: any) => {
          // Delete existing media
          await tx
            .delete(shopProductMedia)
            .where(eq(shopProductMedia.productId, productId));

          // Insert new media
          if (media && media.length > 0) {
            const mediaPayload = media.map((item: any) => ({
              productId,
              url: item.url,
              sortOrder: item.sortOrder,
            }));
            return await tx
              .insert(shopProductMedia)
              .values(mediaPayload)
              .returning();
          }
          return [];
        });
      } catch (error: any) {
        logger.error(`Error in updateShopProductMedia: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    // Increment shop product views
    async incrementShopProductViews(_: any, { id }: any, context: any) {
      try {
        const { db, entity } = await checkAuth(context);

        await db
          .update(shopProducts)
          .set({ numberOfViews: sql`${shopProducts.numberOfViews} + 1` })
          .where(and(eq(shopProducts.id, id), eq(shopProducts.entity, entity)));

        return true;
      } catch (error: any) {
        logger.error(`Error in incrementShopProductViews: ${error.message}`, {
          error,
        });
        throw error;
      }
    },

    // Update shop product options and automate variant generation
    async updateShopProductOptions(
      _: any,
      { productId, input }: any,
      context: any,
    ) {
      try {
        const { db, entity } = await checkAuth(context);

        // Verify product exists and belongs to entity
        const product = await db.query.shopProducts.findFirst({
          where: and(
            eq(shopProducts.id, productId),
            eq(shopProducts.entity, entity),
          ),
          with: {
            media: true,
          },
        });

        if (!product) {
          throw new GraphQLError("Product not found");
        }

        return await db.transaction(async (tx: any) => {
          // 1. Delete existing options
          await tx
            .delete(shopProductOptions)
            .where(eq(shopProductOptions.productId, productId));

          // 2. Insert new options
          if (input && input.length > 0) {
            const optionsPayload = input.map((item: any) => ({
              productId,
              entity,
              name: item.name,
              values: item.values,
            }));
            await tx.insert(shopProductOptions).values(optionsPayload);
          }

          // 3. Generate possible variant combinations
          const combinations: any[] = [];
          if (input && input.length > 0) {
            const generate = (index: number, current: any) => {
              if (index === input.length) {
                combinations.push(current);
                return;
              }
              const option = input[index];
              const values = Array.isArray(option.values) ? option.values : [];
              for (const val of values) {
                // Support both { value: "..." } and raw string values
                const valueStr = typeof val === "object" ? val.value : val;
                generate(index + 1, { ...current, [option.name]: valueStr });
              }
            };
            generate(0, {});
          }

          // 4. Sync Variants
          const existingVariants = await tx.query.shopProductVariants.findMany({
            where: and(
              eq(shopProductVariants.productId, productId),
              eq(shopProductVariants.entity, entity),
            ),
          });

          const createdVariantIds: string[] = [];

          for (const combo of combinations) {
            const title = Object.values(combo).join(" / ");

            // Auto-generate SKU from combination values
            // e.g. "Red / XL" -> "RED-XL"
            const autoSku = Object.values(combo)
              .join("-")
              .toUpperCase()
              .replace(/[^A-Z0-9-]/g, "");

            // Find match by title
            const existingMatch = existingVariants.find(
              (v: any) => v.title === title,
            );

            if (existingMatch) {
              // Update title and options if needed (options might have changed keys/values but same title results)
              await tx
                .update(shopProductVariants)
                .set({
                  title,
                  options: combo,
                  updatedAt: new Date(),
                })
                .where(eq(shopProductVariants.id, existingMatch.id));
              createdVariantIds.push(existingMatch.id);
            } else {
              // Create new variant
              const [newVariant] = await tx
                .insert(shopProductVariants)
                .values({
                  productId,
                  entity,
                  title,
                  sku: autoSku,
                  options: combo,
                  price: product.price,
                  currency: product.currency,
                  image: product.media?.[0]?.url || "",
                  inventory: 0,
                  isOutOfStock: false,
                  externalLink: product.externalLink || "",
                })
                .returning();
              createdVariantIds.push(newVariant.id);
            }
          }

          // Delete variants that no longer exist in combinations
          const toDelete = existingVariants
            .filter((v: any) => !createdVariantIds.includes(v.id))
            .map((v: any) => v.id);

          if (toDelete.length > 0) {
            await tx
              .delete(shopProductVariants)
              .where(inArray(shopProductVariants.id, toDelete));
          }

          // 5. Update Product flags
          await tx
            .update(shopProducts)
            .set({
              hasVariants: combinations.length > 0,
              numberOfVariants: combinations.length,
            })
            .where(eq(shopProducts.id, productId));

          // Return the new list of options
          return await tx.query.shopProductOptions.findMany({
            where: eq(shopProductOptions.productId, productId),
            orderBy: [desc(shopProductOptions.createdAt)],
          });
        });
      } catch (error: any) {
        logger.error(`Error in updateShopProductOptions: ${error.message}`, {
          error,
        });
        throw error;
      }
    },
  },
};
