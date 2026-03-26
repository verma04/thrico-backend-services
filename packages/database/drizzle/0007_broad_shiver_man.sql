DO $$ BEGIN
 CREATE TYPE "storageModule" AS ENUM('FEED', 'MEMBER', 'DISCUSSION_FORUM', 'COMMUNITY', 'JOB', 'LISTING', 'MOMENT', 'OFFER', 'EVENT', 'USER', 'SHOP', 'SURVEY', 'MESSAGING', 'GENERAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"module" "storageModule" NOT NULL,
	"file_key" text NOT NULL,
	"file_url" text,
	"mime_type" text,
	"size_in_bytes" integer DEFAULT 0,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
