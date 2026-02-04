DO $$ BEGIN
 CREATE TYPE "content_status" AS ENUM('PENDING', 'APPROVED', 'BLOCKED', 'DELETED', 'SHADOW_BANNED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "moderation_decision" AS ENUM('ALLOW', 'SHADOW_HIDE', 'WARNING', 'BLOCK', 'SUSPEND');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid,
	"content_id" text NOT NULL,
	"content_type" text NOT NULL,
	"user_id" uuid,
	"ai_score" numeric(5, 4),
	"ai_label" text,
	"ai_categories" jsonb,
	"decision" "moderation_decision",
	"action_taken" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_risk_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"risk_score" numeric(5, 2) DEFAULT '0.0',
	"warning_count" integer DEFAULT 0,
	"blocked_content_count" integer DEFAULT 0,
	"last_violation_at" timestamp,
	"status" text DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "mentorships" ADD COLUMN "isFeatured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_user_id_thricoUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "thricoUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_risk_profiles" ADD CONSTRAINT "user_risk_profiles_user_id_thricoUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "thricoUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_risk_profiles" ADD CONSTRAINT "user_risk_profiles_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
