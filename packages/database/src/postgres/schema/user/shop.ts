import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { entity } from "../tenant";

/**
 * Shop Product Status Enum
 */
export const shopProductStatusEnum = pgEnum("shopProductStatus", [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
  "OUT_OF_STOCK",
]);

/**
 * Shop Product Condition Enum
 */

/**
 * Shop Products Table
 * Main products table for the shop module
 */
export const shopProducts = pgTable("shop_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity").notNull(),

  // Product details
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  sku: varchar("sku", { length: 100 }),
  description: text("description"),

  // Pricing
  price: text("price").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),

  // Classification
  category: varchar("category", { length: 100 }).notNull(),
  tags: text("tags").array(),

  // Condition and Status

  status: shopProductStatusEnum("status").default("ACTIVE").notNull(),

  // Stock management
  hasVariants: boolean("has_variants").default(false).notNull(),
  isOutOfStock: boolean("is_out_of_stock").default(false).notNull(),

  // External linking
  externalLink: text("external_link"), // Affiliate/3rd party product link

  // Metrics
  numberOfViews: integer("number_of_views").default(0).notNull(),
  numberOfVariants: integer("number_of_variants").default(0).notNull(),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  createdBy: uuid("created_by"),
});

/**
 * Shop Product Media Table
 * Stores multiple images for each product
 */
export const shopProductMedia = pgTable("shop_product_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Shop Banners Table
 * Stores carousel/hero banners for the shop landing page
 */
export const shopBanners = pgTable("shop_banners", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: uuid("entity").notNull(),

  // Banner content
  title: varchar("title", { length: 255 }).notNull(),
  image: text("image").notNull(), // CDN URL

  // Product linking
  linkedProductId: uuid("linked_product_id"), // References shop_products

  // Sorting and visibility
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
});

/**
 * Product Variants Table
 * Stores variant-specific data for products with options
 */
export const shopProductVariants = pgTable("shop_product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull(),
  entity: uuid("entity").notNull(),

  // Variant identification
  title: varchar("title", { length: 255 }).notNull(), // e.g. "Blue / Medium"
  sku: varchar("sku", { length: 100 }),

  // Pricing and inventory
  price: text("price").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  inventory: integer("inventory").default(0).notNull(),
  isOutOfStock: boolean("is_out_of_stock").default(false).notNull(),

  // Variant attributes
  options: jsonb("options").notNull(), // { "Color": "Blue", "Size": "M" }

  // Media
  image: text("image"), // Variant-specific image URL

  // External linking
  externalLink: text("external_link"), // Affiliate/3rd party link for this variant

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Product Options Table
 * Stores available option types and values for variant generation
 */
export const shopProductOptions = pgTable("shop_product_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull(),
  entity: uuid("entity").notNull(),

  // Option details
  name: varchar("name", { length: 100 }).notNull(), // e.g. "Color", "Size"
  values: jsonb("values").notNull(), // Array of option values

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Relations
 */
export const shopProductsRelations = relations(
  shopProducts,
  ({ one, many }) => ({
    entity: one(entity, {
      fields: [shopProducts.entity],
      references: [entity.id],
    }),
    // creator: one(user, {
    //   fields: [shopProducts.createdBy],
    //   references: [user.id],
    // }),
    media: many(shopProductMedia),
    variants: many(shopProductVariants),
    options: many(shopProductOptions),
    banners: many(shopBanners),
  }),
);

export const shopProductMediaRelations = relations(
  shopProductMedia,
  ({ one }) => ({
    product: one(shopProducts, {
      fields: [shopProductMedia.productId],
      references: [shopProducts.id],
    }),
  }),
);

export const shopBannersRelations = relations(shopBanners, ({ one }) => ({
  entity: one(entity, {
    fields: [shopBanners.entity],
    references: [entity.id],
  }),
  linkedProduct: one(shopProducts, {
    fields: [shopBanners.linkedProductId],
    references: [shopProducts.id],
  }),
  // creator: one(user, {
  //   fields: [shopBanners.createdBy],
  //   references: [user.id],
  // }),
}));

export const shopProductVariantsRelations = relations(
  shopProductVariants,
  ({ one }) => ({
    product: one(shopProducts, {
      fields: [shopProductVariants.productId],
      references: [shopProducts.id],
    }),
    entity: one(entity, {
      fields: [shopProductVariants.entity],
      references: [entity.id],
    }),
  }),
);

export const shopProductOptionsRelations = relations(
  shopProductOptions,
  ({ one }) => ({
    product: one(shopProducts, {
      fields: [shopProductOptions.productId],
      references: [shopProducts.id],
    }),
    entity: one(entity, {
      fields: [shopProductOptions.entity],
      references: [entity.id],
    }),
  }),
);
