CREATE TABLE IF NOT EXISTS "closeFriends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "closeFriends_user_id_friend_id_entity_id_unique" UNIQUE("user_id","friend_id","entity_id")
);
--> statement-breakpoint
ALTER TABLE "userConnections" ADD COLUMN "is_close_friend" boolean DEFAULT false;