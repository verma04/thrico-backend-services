ALTER TABLE "storage_files" ADD COLUMN "reference_id" uuid;--> statement-breakpoint
ALTER TABLE "storage_files" ADD COLUMN "metadata" jsonb;