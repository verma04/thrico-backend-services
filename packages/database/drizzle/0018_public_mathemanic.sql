ALTER TABLE "userFeed" ADD COLUMN "is_pinned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "userFeed" ADD COLUMN "pinned_at" timestamp;