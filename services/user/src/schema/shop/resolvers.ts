import { shopProducts } from "@thrico/database";
import { eq, desc, and, sql, gt, or, ilike } from "drizzle-orm";
import checkAuth from "../../utils/auth/checkAuth.utils";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";

export const shopResolvers = {
  Query: {
    // Get all shop products with cursor-based pagination
    async getAllShopProducts(
      _: any,
      { limit = 20, cursor, filter }: any,
      context: any,
    ) {
      try {
        const { db, entityId } = await checkAuth(context);

        // Build conditions
        const conditions = [eq(shopProducts.entity, entityId)];

        // Add filter conditions
        if (filter) {
          if (filter.status) {
            conditions.push(eq(shopProducts.status, filter.status));
          }
          if (filter.category) {
            conditions.push(eq(shopProducts.category, filter.category));
          }
          if (filter.search) {
            const searchCondition = or(
              ilike(shopProducts.title, `%${filter.search}%`),
              ilike(shopProducts.description, `%${filter.search}%`),
            );
            if (searchCondition) {
              conditions.push(searchCondition);
            }
          }
        }

        // Add cursor condition if provided
        if (cursor) {
          conditions.push(gt(shopProducts.createdAt, new Date(cursor)));
        }

        // Fetch limit + 1 to determine if there's a next page
        const products = await db.query.shopProducts.findMany({
          where: and(...conditions),
          limit: limit + 1,
          orderBy: desc(shopProducts.createdAt),
          with: {
            media: true,
          },
        });

        // Determine if there's a next page
        const hasNextPage = products.length > limit;
        const nodes = hasNextPage ? products.slice(0, limit) : products;

        // Get total count
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(shopProducts)
          .where(and(...conditions));

        const totalCount = Number(countResult?.count || 0);

        // Build edges
        const edges = nodes.map((product: any) => ({
          cursor: product.createdAt.toISOString(),
          node: product,
        }));

        return {
          edges,
          pageInfo: {
            hasNextPage,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          totalCount,
        };
      } catch (error: any) {
        log.error("Error in getAllShopProducts", { error: error.message });
        throw error;
      }
    },

    // Get single shop product by ID and track view
    async getShopProduct(_: any, { id }: any, context: any) {
      try {
        const { db, entityId } = await checkAuth(context);

        const product = await db.query.shopProducts.findFirst({
          where: and(
            eq(shopProducts.id, id),
            eq(shopProducts.entity, entityId),
          ),
          with: {
            media: true,
            variants: true,
            options: true,
          },
        });

        if (!product) {
          throw new GraphQLError("Product not found");
        }

        // Increment view count asynchronously (don't wait for it)
        db.update(shopProducts)
          .set({ numberOfViews: sql`${shopProducts.numberOfViews} + 1` })
          .where(eq(shopProducts.id, id))
          .then(() => {
            log.info("Product view incremented", { productId: id });
          })
          .catch((error: any) => {
            log.error("Error incrementing product views", {
              error,
              productId: id,
            });
          });

        return product;
      } catch (error: any) {
        log.error("Error in getShopProduct", { error: error.message });
        throw error;
      }
    },
  },
};
