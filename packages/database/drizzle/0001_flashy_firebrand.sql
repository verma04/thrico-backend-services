DROP INDEX IF EXISTS "slug_type_unique";--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqMembers" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqCommunities" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqForums" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowEvents" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsEvents" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqEvents" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowJobs" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsJobs" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqJobs" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowMentorship" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "autoApproveMentorship" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsMentorship" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqMentorship" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowListing" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "autoApproveListing" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsListing" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqListing" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowShop" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "autoApproveShop" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsShop" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqShop" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowOffers" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "autoApproveOffers" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsOffers" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqOffers" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowSurveys" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "autoApproveSurveys" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsSurveys" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqSurveys" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowPolls" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "autoApprovePolls" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsPolls" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqPolls" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "allowStories" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "autoApproveStories" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsStories" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqStories" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsWallOfFame" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqWallOfFame" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "termAndConditionsGamification" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" ADD COLUMN "faqGamification" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "static_pages_slug_type_unique" ON "staticPages" ("slug","type_id");