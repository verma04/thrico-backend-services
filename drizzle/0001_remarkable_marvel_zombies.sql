CREATE TABLE IF NOT EXISTS "contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "emailTemplate" ADD COLUMN "json" text;--> statement-breakpoint
ALTER TABLE "userFeed" ADD COLUMN "is_ai_content" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "thrico_moments" ADD COLUMN "is_ai_content" boolean DEFAULT false;