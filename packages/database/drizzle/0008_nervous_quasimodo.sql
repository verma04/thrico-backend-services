DO $$ BEGIN
 CREATE TYPE "moderation_job_status" AS ENUM('PENDING', 'PROCESSING', 'DONE', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "moderation_state_status" AS ENUM('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'FLAGGED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_moderation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" text NOT NULL,
	"entity_id" uuid,
	"classification" text,
	"confidence" numeric(5, 4),
	"model_used" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid,
	"module" text DEFAULT 'moderation',
	"tokens" integer DEFAULT 0,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" text NOT NULL,
	"status" "moderation_job_status" DEFAULT 'PENDING',
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "commentFeed" ADD COLUMN "moderation_status" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "commentFeed" ADD COLUMN "moderation_result" text;--> statement-breakpoint
ALTER TABLE "commentFeed" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "userFeed" ADD COLUMN "moderation_status" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "userFeed" ADD COLUMN "moderation_result" text;--> statement-breakpoint
ALTER TABLE "userFeed" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_moderation_logs" ADD CONSTRAINT "ai_moderation_logs_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_token_usage" ADD CONSTRAINT "ai_token_usage_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
