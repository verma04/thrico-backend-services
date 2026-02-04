DO $$ BEGIN
 CREATE TYPE "shopProductStatus" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"image" text NOT NULL,
	"linked_product_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"entity" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"values" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"entity" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"sku" varchar(100),
	"price" text NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"inventory" integer DEFAULT 0 NOT NULL,
	"is_out_of_stock" boolean DEFAULT false NOT NULL,
	"options" jsonb NOT NULL,
	"image" text,
	"external_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"price" text NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"category" varchar(100) NOT NULL,
	"tags" text[],
	"status" "shopProductStatus" DEFAULT 'ACTIVE' NOT NULL,
	"has_variants" boolean DEFAULT false NOT NULL,
	"is_out_of_stock" boolean DEFAULT false NOT NULL,
	"external_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	CONSTRAINT "shop_products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "eventsss" ALTER COLUMN "cover" SET DEFAULT 'default-events.png';