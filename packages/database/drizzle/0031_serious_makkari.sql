CREATE TABLE IF NOT EXISTS "feedMetadataNotifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notificationType" NOT NULL,
	"notification_id" uuid NOT NULL,
	"content" text,
	"actors" jsonb,
	"count" integer DEFAULT 1
);
