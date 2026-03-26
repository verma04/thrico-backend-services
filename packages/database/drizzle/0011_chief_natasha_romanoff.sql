ALTER TABLE "discussionForums" ADD COLUMN "moderationStatus" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "discussionForums" ADD COLUMN "moderationResult" text;--> statement-breakpoint
ALTER TABLE "discussionForums" ADD COLUMN "moderatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "discussionForumComments" ADD COLUMN "moderationStatus" "moderation_state_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "discussionForumComments" ADD COLUMN "moderationResult" text;--> statement-breakpoint
ALTER TABLE "discussionForumComments" ADD COLUMN "moderatedAt" timestamp;