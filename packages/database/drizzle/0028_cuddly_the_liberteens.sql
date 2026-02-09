DO $$ BEGIN
 CREATE TYPE "communityNotificationType" AS ENUM('WELCOME', 'JOIN_REQUEST', 'CREATED', 'MEMBER_JOINED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityMetadataNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"type" "communityNotificationType" NOT NULL,
	"notification_id" uuid NOT NULL,
	"content" text
);
--> statement-breakpoint
ALTER TABLE "userNotifications" DROP COLUMN IF EXISTS "connection_id";--> statement-breakpoint
ALTER TABLE "userNotifications" DROP COLUMN IF EXISTS "communities_id";--> statement-breakpoint
ALTER TABLE "userNotifications" DROP COLUMN IF EXISTS "community_id";