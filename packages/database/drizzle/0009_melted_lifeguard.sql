ALTER TABLE "eventsss" ADD COLUMN "moderationStatus" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "eventsss" ADD COLUMN "moderationResult" text;--> statement-breakpoint
ALTER TABLE "eventsss" ADD COLUMN "moderatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "-community" ADD COLUMN "moderationStatus" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "-community" ADD COLUMN "moderationResult" text;--> statement-breakpoint
ALTER TABLE "-community" ADD COLUMN "moderatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "listing0" ADD COLUMN "moderationStatus" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "listing0" ADD COLUMN "moderationResult" text;--> statement-breakpoint
ALTER TABLE "listing0" ADD COLUMN "moderatedAt" timestamp;