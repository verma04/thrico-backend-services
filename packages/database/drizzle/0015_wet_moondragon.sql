DO $$ BEGIN
 CREATE TYPE "emailDomainStatus" AS ENUM('pending', 'verified', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "emailSubscriptionPlan" AS ENUM('free', 'pro', 'enterprise');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "emailSubscriptionStatus" AS ENUM('active', 'inactive', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "userStatus" ADD VALUE 'SUSPENDED';--> statement-breakpoint
ALTER TYPE "reportStatus" ADD VALUE 'UNDER_REVIEW';--> statement-breakpoint
ALTER TYPE "reportStatus" ADD VALUE 'APPROVED';--> statement-breakpoint
ALTER TYPE "reportStatus" ADD VALUE 'REJECTED';--> statement-breakpoint
ALTER TYPE "storageModule" ADD VALUE 'OFFERS';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emailDomain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"verification_token" text,
	"dkim_tokens" text,
	"spf_record" text,
	"status" "emailDomainStatus" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emailLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"sender_address" text NOT NULL,
	"ses_message_id" text,
	"status" text DEFAULT 'sent',
	"sent_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emailSubscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"plan" "emailSubscriptionPlan" DEFAULT 'free' NOT NULL,
	"number_of_emails_per_month" integer DEFAULT 1000 NOT NULL,
	"status" "emailSubscriptionStatus" DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emailTemplate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emailTopup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"extra_emails" integer NOT NULL,
	"purchased_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emailUsage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"emails_sent" integer DEFAULT 0 NOT NULL,
	"number_of_emails_per_month" integer DEFAULT 1000 NOT NULL,
	"period_start" timestamp DEFAULT now() NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"headquarters" text,
	"cover" text,
	"description" text NOT NULL,
	"slug" text,
	"isApproved" boolean DEFAULT false NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"isBlocked" boolean DEFAULT false NOT NULL,
	"phone" text,
	"email" text,
	"facebook" text,
	"instagram" text,
	"payload" jsonb,
	"type" text NOT NULL,
	"industry" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alumni" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" text NOT NULL,
	"avatar" text,
	"lastName" text NOT NULL,
	"email" text NOT NULL,
	"loginType" "loginType" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"googleId" text,
	CONSTRAINT "alumni_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alumniConnection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"followers_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"isAccepted" boolean NOT NULL,
	CONSTRAINT "alumniConnection_user_id_followers_id_unique" UNIQUE("user_id","followers_id"),
	CONSTRAINT "alumniConnection" UNIQUE("user_id","followers_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alumniKyc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affliction" json,
	"referralSource" json,
	"comment" json NOT NULL,
	"agreement" boolean NOT NULL,
	"orgId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alumniProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" text,
	"designation" text,
	"DOB" text,
	"user_id" uuid NOT NULL,
	"experience" json,
	"education" json,
	"phone" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alumniConnectionRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"isAccepted" boolean NOT NULL,
	CONSTRAINT "alumniConnectionRequest_user_id_sender_id_unique" UNIQUE("user_id","sender_id"),
	CONSTRAINT "alumniRequest" UNIQUE("user_id","sender_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alumniResume" (
	"currentPosition" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alumniEntityProfile" (
	"user_id" uuid,
	"entity_id" uuid,
	"isApproved" boolean DEFAULT false NOT NULL,
	"isRequested" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "aboutUser" ALTER COLUMN "currentPosition" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "aboutUser" ALTER COLUMN "about" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "aboutUser" ADD COLUMN "linkedin" text;--> statement-breakpoint
ALTER TABLE "aboutUser" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "aboutUser" ADD COLUMN "portfolio" text;--> statement-breakpoint
ALTER TABLE "aboutUser" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "aboutUser" DROP COLUMN IF EXISTS "user_ID";--> statement-breakpoint
ALTER TABLE "aboutUser" DROP COLUMN IF EXISTS "userPronounsStatus";--> statement-breakpoint
ALTER TABLE "aboutUser" DROP COLUMN IF EXISTS "social";--> statement-breakpoint
ALTER TABLE "aboutUser" DROP COLUMN IF EXISTS "headline";