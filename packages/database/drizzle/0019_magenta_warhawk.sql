DO $$ BEGIN
 CREATE TYPE "link_type" AS ENUM('DOMAIN', 'URL', 'PATTERN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "severity" AS ENUM('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banned_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"word" text NOT NULL,
	"severity" "severity" DEFAULT 'MEDIUM',
	"category" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocked_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"url" text NOT NULL,
	"link_type" "link_type" DEFAULT 'DOMAIN',
	"is_blocked" boolean DEFAULT true,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"content_id" text NOT NULL,
	"reported_by_id" uuid NOT NULL,
	"reported_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "reportStatus" DEFAULT 'PENDING',
	"resolved_by_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"auto_moderation_enabled" boolean DEFAULT true,
	"banned_words_action" text DEFAULT 'FLAG',
	"blocked_links_action" text DEFAULT 'DELETE',
	"spam_detection_enabled" boolean DEFAULT true,
	"spam_threshold" integer DEFAULT 50,
	"auto_flag_threshold" integer DEFAULT 3,
	"auto_hide_threshold" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "moderation_settings_entity_id_unique" UNIQUE("entity_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "banned_words" ADD CONSTRAINT "banned_words_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocked_links" ADD CONSTRAINT "blocked_links_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_by_id_thricoUser_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "thricoUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_user_id_thricoUser_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "thricoUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_id_thricoUser_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "thricoUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_settings" ADD CONSTRAINT "moderation_settings_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "entity"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
