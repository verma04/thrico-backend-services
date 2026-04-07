ALTER TABLE "thricoUser" ADD COLUMN "referralCode" text;--> statement-breakpoint
ALTER TABLE "thricoUser" ADD COLUMN "referredBy" text;--> statement-breakpoint
ALTER TABLE "thricoUser" ADD CONSTRAINT "thricoUser_referralCode_unique" UNIQUE("referralCode");