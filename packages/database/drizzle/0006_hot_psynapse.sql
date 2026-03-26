ALTER TYPE "reportModule" ADD VALUE 'COMMUNITY';--> statement-breakpoint
ALTER TYPE "reportModule" ADD VALUE 'JOB';--> statement-breakpoint
ALTER TYPE "reportModule" ADD VALUE 'LISTING';--> statement-breakpoint
ALTER TYPE "reportModule" ADD VALUE 'MOMENT';--> statement-breakpoint
ALTER TYPE "reportModule" ADD VALUE 'OFFER';--> statement-breakpoint
ALTER TYPE "reportModule" ADD VALUE 'EVENT';--> statement-breakpoint
ALTER TYPE "reportModule" ADD VALUE 'USER';--> statement-breakpoint
ALTER TYPE "reportModule" ADD VALUE 'SHOP';--> statement-breakpoint
ALTER TYPE "reportModule" ADD VALUE 'SURVEY';--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "targetId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "reportedBy" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "status" "reportStatus" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "entity_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN IF EXISTS "userToEntityId";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN IF EXISTS "action";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN IF EXISTS "performedBy";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN IF EXISTS "entity";