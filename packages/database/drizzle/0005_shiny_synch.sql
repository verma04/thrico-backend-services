CREATE TABLE IF NOT EXISTS "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"boundary_polygon" "geometry",
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "userToEntity" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "eventsss" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "-community" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "mentorships" ADD COLUMN "city_id" uuid;