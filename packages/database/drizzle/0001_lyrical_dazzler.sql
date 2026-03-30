DROP TABLE IF EXISTS "page";--> statement-breakpoint
DROP TABLE IF EXISTS "alumni";--> statement-breakpoint
DROP TABLE IF EXISTS "alumniConnection";--> statement-breakpoint
DROP TABLE IF EXISTS "alumniKyc";--> statement-breakpoint
DROP TABLE IF EXISTS "alumniProfile";--> statement-breakpoint
DROP TABLE IF EXISTS "alumniConnectionRequest";--> statement-breakpoint
DROP TABLE IF EXISTS "alumniResume";--> statement-breakpoint
DROP TABLE IF EXISTS "alumniEntityProfile";--> statement-breakpoint
ALTER TABLE "aboutUser" ALTER COLUMN "about" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "aboutUser" ALTER COLUMN "currentPosition" SET DATA TYPE varchar(200);--> statement-breakpoint
ALTER TABLE "aboutUser" ADD COLUMN IF NOT EXISTS "user_ID" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "aboutUser" ADD COLUMN IF NOT EXISTS "userPronounsStatus" "userPronounsStatus";--> statement-breakpoint
ALTER TABLE "aboutUser" ADD COLUMN IF NOT EXISTS "social" json;--> statement-breakpoint
ALTER TABLE "aboutUser" ADD COLUMN IF NOT EXISTS "headline" varchar;--> statement-breakpoint
ALTER TABLE "aboutUser" DROP COLUMN IF EXISTS "linkedin";--> statement-breakpoint
ALTER TABLE "aboutUser" DROP COLUMN IF EXISTS "instagram";--> statement-breakpoint
ALTER TABLE "aboutUser" DROP COLUMN IF EXISTS "portfolio";--> statement-breakpoint
ALTER TABLE "aboutUser" DROP COLUMN IF EXISTS "user_id";