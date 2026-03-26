DO $$ BEGIN
 CREATE TYPE "momentNotificationType" AS ENUM('MOMENT_LIKE', 'MOMENT_COMMENT', 'MOMENT_POSTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "notificationModule" ADD VALUE 'MOMENT';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "momentNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "momentNotificationType" NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"moment_id" uuid,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "thricoUser" ADD COLUMN "isDeletionPending" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "thricoUser" ADD COLUMN "deletionRequestedAt" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "moment_notification_id" uuid;