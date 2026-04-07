DO $$ BEGIN
 CREATE TYPE "AutomationCampaignStatus" AS ENUM('active', 'inactive', 'draft');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"org_id" uuid NOT NULL,
	"status" "AutomationCampaignStatus" DEFAULT 'draft' NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_config" json NOT NULL,
	"segmentation_config" json,
	"action_config" json NOT NULL,
	"frequency" text,
	"module" text,
	"channel_type" text,
	"target_users" json,
	"canvas_nodes" json,
	"canvas_edges" json,
	"cron_type" text,
	"cron_day" text,
	"cron_date" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action_index" numeric NOT NULL,
	"action_type" text NOT NULL,
	"status" text NOT NULL,
	"result" json,
	"error_message" text,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"context" json,
	"attempts" numeric DEFAULT '0',
	"last_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "emailTemplate" ADD COLUMN "is_deletable" boolean DEFAULT true;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_job_id_automation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "automation_jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_campaign_id_automation_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "automation_campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
