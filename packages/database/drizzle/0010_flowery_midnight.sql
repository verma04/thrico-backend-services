ALTER TYPE "notificationType" ADD VALUE 'POINTS_EARNED';--> statement-breakpoint
ALTER TYPE "notificationType" ADD VALUE 'BADGE_UNLOCKED';--> statement-breakpoint
ALTER TABLE "userNotifications" ADD COLUMN "is_read" text DEFAULT 'false';