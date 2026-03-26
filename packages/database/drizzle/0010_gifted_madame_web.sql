ALTER TABLE "jobss" ADD COLUMN "moderationStatus" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "jobss" ADD COLUMN "moderationResult" text;--> statement-breakpoint
ALTER TABLE "jobss" ADD COLUMN "moderatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "moderationStatus" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "moderationResult" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "moderatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "shop_products" ADD COLUMN "moderationStatus" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "shop_products" ADD COLUMN "moderationResult" text;--> statement-breakpoint
ALTER TABLE "shop_products" ADD COLUMN "moderatedAt" timestamp;