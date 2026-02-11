DO $$ BEGIN
 CREATE TYPE "feedNotificationType" AS ENUM('FEED_COMMENT', 'FEED_LIKE', 'FEED_REPOST', 'POLL_VOTE', 'CLOSE_FRIEND_STORY', 'STORY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "gamificationNotificationType" AS ENUM('POINTS_EARNED', 'BADGE_UNLOCKED', 'RANK_UP');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "jobNotificationType" AS ENUM('JOB_APPLICATION', 'JOB_POSTED', 'JOB_LIKE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "listingNotificationType" AS ENUM('LISTING_APPROVED', 'LISTING_CONTACT', 'LISTING_MESSAGE', 'LISTING_LIKE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "networkNotificationType" AS ENUM('CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'CLOSE_FRIEND_STORY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notificationModule" AS ENUM('COMMUNITY', 'FEED', 'NETWORK', 'JOB', 'LISTING', 'GAMIFICATION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "communityNotificationType" ADD VALUE 'POST_APPROVED';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communityNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "communityNotificationType" NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_id" uuid,
	"entity_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "feedNotificationType" NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"feed_id" uuid NOT NULL,
	"content" text NOT NULL,
	"actors" jsonb,
	"count" integer DEFAULT 1 NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gamificationNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "gamificationNotificationType" NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"content" text NOT NULL,
	"points" integer,
	"badge_name" text,
	"badge_image_url" text,
	"rank_name" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "networkNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "networkNotificationType" NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "notificationModule" NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"community_notification_id" uuid,
	"feed_notification_id" uuid,
	"network_notification_id" uuid,
	"job_notification_id" uuid,
	"listing_notification_id" uuid,
	"gamification_notification_id" uuid
);
--> statement-breakpoint
DROP TABLE "communityMetadataNotifications";--> statement-breakpoint
DROP TABLE "feedMetadataNotifications";--> statement-breakpoint
DROP TABLE "userNotifications";--> statement-breakpoint
ALTER TABLE "listingNotifications" ALTER COLUMN "listing_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobNotifications" ADD COLUMN "type" "jobNotificationType" NOT NULL;--> statement-breakpoint
ALTER TABLE "jobNotifications" ADD COLUMN "sender_id" uuid;--> statement-breakpoint
ALTER TABLE "jobNotifications" ADD COLUMN "entity_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "jobNotifications" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "jobNotifications" ADD COLUMN "is_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobNotifications" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "listingNotifications" ADD COLUMN "type" "listingNotificationType" NOT NULL;--> statement-breakpoint
ALTER TABLE "listingNotifications" ADD COLUMN "sender_id" uuid;--> statement-breakpoint
ALTER TABLE "listingNotifications" ADD COLUMN "entity_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "listingNotifications" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "listingNotifications" ADD COLUMN "is_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listingNotifications" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "jobNotifications" DROP COLUMN IF EXISTS "notification_id";--> statement-breakpoint
ALTER TABLE "listingNotifications" DROP COLUMN IF EXISTS "notification_id";