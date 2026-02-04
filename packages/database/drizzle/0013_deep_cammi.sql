DO $$ BEGIN
 CREATE TYPE "form_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "preview_type" AS ENUM('SCROLL_LONG', 'MULTI_STEP');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "question_type" AS ENUM('SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'WEBSITE', 'NUMBER', 'OPINION_SCALE', 'RATING', 'MULTIPLE_CHOICE', 'DROPDOWN', 'ISOPTION', 'DATE', 'TIME', 'YES-NO', 'LEGAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "rating_type" AS ENUM('star', 'heart', 'thumb');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "survey_status" AS ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid,
	"added_by" "addedBy" DEFAULT 'USER',
	"title" varchar(255) DEFAULT 'Untitled Form' NOT NULL,
	"description" text,
	"appearance" jsonb NOT NULL,
	"preview_type" "preview_type" DEFAULT 'MULTI_STEP',
	"status" "form_status" DEFAULT 'DRAFT',
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"type" "question_type" NOT NULL,
	"question" text NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"required" boolean DEFAULT false,
	"max_length" integer,
	"min" integer,
	"max" integer,
	"scale" integer,
	"rating_type" "rating_type" DEFAULT 'star',
	"options" jsonb,
	"labels" jsonb,
	"allow_multiple" boolean DEFAULT false,
	"legal_text" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"survey_id" uuid,
	"answers" jsonb NOT NULL,
	"respondent_id" uuid,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(255),
	"status" "survey_status" DEFAULT 'DRAFT',
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
DROP TABLE "customFormAnswers";--> statement-breakpoint
DROP TABLE "customFormFields";--> statement-breakpoint
DROP TABLE "customFormSubmissions";--> statement-breakpoint
DROP TABLE "customForms";--> statement-breakpoint
DROP TABLE "customFormsAuditLogs";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_form_id_custom_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "custom_forms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_form_id_custom_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "custom_forms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "surveys" ADD CONSTRAINT "surveys_form_id_custom_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "custom_forms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
