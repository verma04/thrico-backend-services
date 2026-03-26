DO $$ BEGIN
 CREATE TYPE "nearbyDiscoveryPrivacy" AS ENUM('VISIBLE', 'APPROXIMATE', 'HIDDEN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userNearbySettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"privacy" "nearbyDiscoveryPrivacy" DEFAULT 'VISIBLE' NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "userLoction" ADD COLUMN "location" "geometry";--> statement-breakpoint
ALTER TABLE "userLoction" ADD COLUMN "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "eventsss" ADD COLUMN "location_point" "geometry";--> statement-breakpoint
ALTER TABLE "-community" ADD COLUMN "location_point" "geometry";