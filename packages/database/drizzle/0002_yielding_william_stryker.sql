CREATE TABLE IF NOT EXISTS "offer_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(50),
	"org_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "company" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "discount" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "validity_start" timestamp;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "validity_end" timestamp;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "status" text DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "claims_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "views_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offers" ADD CONSTRAINT "offers_category_id_offer_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "offer_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN IF EXISTS "cover";