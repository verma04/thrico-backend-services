ALTER TABLE "offers" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "status" SET DATA TYPE "discussionForumStatus" USING (CASE WHEN "status" = 'ACTIVE' THEN 'APPROVED'::"discussionForumStatus" ELSE "status"::"discussionForumStatus" END);--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "isApprovedAt" timestamp;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "addedBy" "addedBy" DEFAULT 'USER';--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "user_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offers" ADD CONSTRAINT "offers_user_id_thricoUser_id_fk" FOREIGN KEY ("user_id") REFERENCES "thricoUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
