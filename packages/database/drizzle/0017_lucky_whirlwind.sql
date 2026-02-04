ALTER TYPE "source" ADD VALUE 'survey';--> statement-breakpoint
ALTER TABLE "userFeed" ADD COLUMN "survey_id" uuid;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "shared_as_feed" boolean DEFAULT false;