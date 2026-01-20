CREATE TABLE IF NOT EXISTS "offerVerification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isVerifiedAt" timestamp,
	"verifiedBy" uuid,
	"isVerified" boolean DEFAULT false,
	"verificationReason" text,
	"offer_id" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offerVerification" ADD CONSTRAINT "offerVerification_verifiedBy_thricoUser_id_fk" FOREIGN KEY ("verifiedBy") REFERENCES "thricoUser"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offerVerification" ADD CONSTRAINT "offerVerification_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
