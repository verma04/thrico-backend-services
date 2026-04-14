ALTER TABLE "entitySettings" ADD COLUMN "feedOrders" jsonb;--> statement-breakpoint
ALTER TABLE "entitySettings" DROP COLUMN IF EXISTS "feedOrder";